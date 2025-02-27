<script lang="ts">
import IconButton from '$components/button/IconButton.svelte'
import ProfileLayout from '$components/layout/ProfileLayout.svelte'
import ProfileImageSelector from '$components/profile/ProfileImageSelector.svelte'
import Input from '$components/input/Input.svelte'
import Button from '$components/button/Button.svelte'
import { onMount } from 'svelte'
import Log from '$lib/utils/Log'
import type { PageData } from './$types'
import userProfile from '$stores/userProfile'
import type { Principal } from '@dfinity/principal'
import { getCanisterId } from '$lib/helpers/canisterId'
import getDefaultImageUrl from '$lib/utils/getDefaultImageUrl'
import { authState } from '$stores/auth'
import { goto } from '$app/navigation'
import { registerEvent } from '$components/analytics/GA.svelte'
import { individualUser, userIndex } from '$lib/helpers/backend'
import goBack from '$lib/utils/goBack'
import Icon from '$components/icon/Icon.svelte'

export let data: PageData

let {
  username,
  username_set,
  displayName,
  imgSrc,
  userPrincipal,
}: {
  username_set: boolean
  username?: string
  displayName?: string
  imgSrc?: string
  userPrincipal: Principal
} = data

let pageLoaded = false
const usernameSetFirstTime = username_set
let loading = true
let error = ''
let values: {
  username: string
  name: string
  imageSrc: string
}

async function isUsernameTaken() {
  const newUsername = values.username.toLowerCase().trim()
  if (!username_set) {
    return false
  } else if (newUsername === username) {
    return false
  } else {
    try {
      return await userIndex().get_index_details_is_user_name_taken(newUsername)
    } catch (e) {
      return true
    }
  }
}

function resetAllFields() {
  values.name = values.imageSrc = ''
}

function filterUsernameKeystrokes(e: KeyboardEvent) {
  if (!/^\w+$/.test(e.key)) {
    e.preventDefault()
  }
}

async function saveChanges() {
  loading = true
  error = ''
  if (!values.name) {
    error = 'Name is required'
    loading = false
    Log({ error }, 'warn')
    return
  } else if (!values.username) {
    error = 'Username is required'
    loading = false
    Log({ error }, 'warn')
    return
  } else if (!username_set && (await isUsernameTaken())) {
    error = 'This username is already taken'
    loading = false
    Log({ error }, 'warn')
    return
  }

  Log({ res: values, from: '0 saveChanges' }, 'info')

  const newUsername = values.username.toLowerCase().trim()
  if (username !== newUsername) {
    try {
      Promise.all([
        userIndex().update_index_with_unique_user_name_corresponding_to_user_principal_id(
          newUsername,
          userPrincipal,
        ),
        individualUser().update_profile_set_unique_username_once(newUsername),
      ])
      username_set = true
      username = newUsername

      $userProfile.username_set = true
      $userProfile.unique_user_name = newUsername
      const canId = await getCanisterId(userPrincipal.toString())
      if (canId) {
        try {
          const { idb } = await import('$lib/idb')
          idb.set('canisters', newUsername, canId)
        } catch (e) {
          Log(
            { error: e, source: '1 saveChanges Profile', type: 'idb' },
            'error',
          )
          loading = false
        }
      }
    } catch (e) {
      loading = false
      Log({ error: e, from: '1 saveChanges' }, 'error')
    }
  }
  try {
    const res = await individualUser().update_profile_display_details({
      display_name: [values.name],
      profile_picture_url: [values.imageSrc],
    })

    displayName = values.name
    imgSrc = values.imageSrc
    if ('Ok' in res) {
      $userProfile.display_name = res.Ok.display_name[0] || ''
      $userProfile.profile_picture_url =
        res.Ok.profile_picture_url[0] || getDefaultImageUrl($authState.idString)
    } else {
      error = 'Could not save your profile. Please login again to try again.'
    }
    loading = false
    registerEvent('edit_my_profile', {
      userId: $userProfile.principal_id,
      display_name: displayName,
      profile_image: imgSrc,
      username: $userProfile.unique_user_name,
    })

    goto(
      `/profile/${
        username_set ? $userProfile.unique_user_name : $userProfile.principal_id
      }`,
      { replaceState: true },
    )
  } catch (e) {
    loading = false
    Log({ error: e, from: '2 saveChanges' }, 'error')
  }
}

onMount(async () => {
  values = {
    username: username ?? '',
    name: displayName ?? '',
    imageSrc: imgSrc ?? '',
  }
  loading = false
  pageLoaded = true
})

$: userId = username_set
  ? $userProfile.unique_user_name
  : $userProfile.principal_id
</script>

<svelte:head>
  <title>Edit Profile | Hot or Not</title>
</svelte:head>
{#if pageLoaded}
  <ProfileLayout>
    <svelte:fragment slot="top-left">
      <IconButton
        iconName="caret-left"
        iconClass="h-7 w-7"
        disabled={loading}
        on:click={() => goBack(`/profile/${userId}`, true)}
        class="shrink-0" />
    </svelte:fragment>

    <div slot="top-center" class="text-lg font-bold">Edit profile</div>

    <svelte:fragment slot="content">
      <div
        class="flex h-full w-full flex-col items-center justify-start space-y-8 overflow-y-auto p-3 md:p-8">
        <ProfileImageSelector
          bind:src={values.imageSrc}
          bind:error
          bind:loading />
        <div class="flex w-full flex-col space-y-2">
          <span class="text-white/60">Your name *</span>
          <Input
            disabled={loading}
            bind:value={values.name}
            type="text"
            maxlength={40}
            placeholder="Enter your name here"
            class="w-full rounded-md bg-white/10 py-4" />
        </div>
        <div class="flex w-full flex-col space-y-2">
          <span class="text-white/60">Username *</span>
          <Input
            disabled={loading || username_set}
            bind:value={values.username}
            on:keydown={filterUsernameKeystrokes}
            type="text"
            maxlength={20}
            placeholder="Enter your username here"
            class="placeholder:norma w-full rounded-md bg-white/10 py-4 lowercase placeholder:normal-case" />
          {#if usernameSetFirstTime}
            <span class="text-xs opacity-50">
              You have already set your username, it cannot be changed now. You
              can change your display name or profile picture
            </span>
          {:else}
            <span class="text-xs opacity-50">
              You can only set/change your username once
            </span>
          {/if}
        </div>
        {#if error}
          <span class="text-sm text-red-500">{error}</span>
        {/if}
        <div class="flex w-full items-center justify-between space-x-4 pt-16">
          <Button
            disabled={loading}
            on:click={resetAllFields}
            type="secondary"
            class="w-full flex-1">
            Reset
          </Button>
          <Button
            disabled={loading}
            on:click={saveChanges}
            preload
            class="w-full flex-1">
            Save changes
          </Button>
        </div>
      </div>
    </svelte:fragment>
  </ProfileLayout>
{/if}
