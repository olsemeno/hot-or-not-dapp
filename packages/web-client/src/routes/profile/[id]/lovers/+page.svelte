<script lang="ts">
import { page } from '$app/stores'
import Button from '$components/button/Button.svelte'
import IconButton from '$components/button/IconButton.svelte'
import Icon from '$components/icon/Icon.svelte'
import IntersectionObserver from '$components/intersection-observer/IntersectionObserver.svelte'
import ProfileLayout from '$components/layout/ProfileLayout.svelte'
import {
  fetchLovers,
  loveUser,
  type UserProfileFollows,
} from '$lib/helpers/profile'
import goBack from '$lib/utils/goBack'
import Log from '$lib/utils/Log'
import { authState } from '$stores/auth'
import userProfile from '$stores/userProfile'
import type { PageData } from './$types'

export let data: PageData
let { me, profile } = data

let loading = false
let errorWhileFetching = false
let noMoreUsers = false
let fetchedUsersCount: bigint | undefined = undefined
let users: UserProfileFollows[] = []

$: userId = profile?.username_set
  ? profile?.unique_user_name
  : profile?.principal_id || $page.params.id

async function loadLovers() {
  if (noMoreUsers) {
    return
  }

  loading = true
  errorWhileFetching = false
  try {
    const res = await fetchLovers($page.params.id, fetchedUsersCount)

    if (res.error) {
      errorWhileFetching = true
      loading = false
      return
    }

    if (!res.lovers) {
      return
    }

    users.push(...res.lovers)
    users = users
    noMoreUsers = res.noMoreLovers
    const lastEntry = res.lovers[res.lovers.length - 1]?.index_id
    if (lastEntry) {
      fetchedUsersCount = lastEntry
    } else {
      noMoreUsers = true
    }
    loading = false
  } catch (e) {
    Log({ error: e, from: '1 loadLovers' }, 'error')
  }

  loading = false
}

async function handleLove(userIndex: number, userId?: string) {
  if (!userId) return
  if (!$authState.isLoggedIn) {
    $authState.showLogin = true
    return
  }
  const res = await loveUser(userId)
  if (res) {
    users[userIndex].i_follow = !users[userIndex].i_follow
    users = users
  }
}
</script>

<svelte:head>
  <title>{me ? 'Your' : "User's"} Lovers | Hot or Not</title>
</svelte:head>

<ProfileLayout>
  <svelte:fragment slot="top-left">
    <IconButton
      iconName="caret-left"
      iconClass="h-7 w-7"
      on:click={() => goBack(`/profile/${userId}`, true)}
      class="shrink-0" />
  </svelte:fragment>
  <div slot="top-center" class="text-lg font-bold">
    {me ? 'Your Lovers' : 'Lovers'}
  </div>

  <div class="hide-scrollbar h-full w-full overflow-y-auto" slot="content">
    <div class="mx-auto flex max-w-5xl flex-col space-y-8 p-3 md:p-8">
      {#if users.length}
        {#each users as user, i}
          {@const profileId = user.username_set
            ? user.unique_user_name
            : user.principal_id || ''}
          <div class="flex w-full items-center justify-between text-white">
            <a
              href="/profile/{profileId}"
              class="flex w-full items-center space-x-4 overflow-hidden">
              <img
                src={user.profile_picture_url}
                alt="avatar"
                class="h-10 w-10 shrink-0 rounded-full object-cover" />
              <div class="flex grow flex-col items-start overflow-hidden">
                <span>{user.display_name}</span>
                <span
                  class="w-full overflow-hidden text-ellipsis whitespace-nowrap pr-4 text-sm text-white/50">
                  @{user.unique_user_name}
                </span>
              </div>
            </a>
            {#if $userProfile.principal_id !== user.principal_id}
              <div class="w-full max-w-[5rem] shrink-0">
                <Button
                  type={user.i_follow ? 'secondary' : 'primary'}
                  on:click={() => handleLove(i, user.principal_id)}
                  class="w-full px-4 py-1 text-sm">
                  {user.i_follow ? 'Loving' : 'Love'}
                </Button>
              </div>
            {/if}
          </div>
        {/each}
      {:else if !loading}
        <div class="flex w-full items-center justify-center space-x-2 py-8">
          <span>No users to list</span>
        </div>
      {/if}
      {#if loading}
        <div class="flex w-full items-center justify-center space-x-2 py-8">
          <Icon name="loading" class="h-4 w-4 animate-spin" />
          <span>Loading</span>
        </div>
      {/if}
      {#if noMoreUsers && userId.length && users.length}
        <div class="flex w-full items-center justify-center space-x-2 py-8">
          <span class="text-white/50">No more users</span>
        </div>
      {/if}
      <IntersectionObserver
        on:intersected={loadLovers}
        disabled={loading || errorWhileFetching}
        threshold={0.1}
        intersect={!noMoreUsers}>
        <svelte:fragment>
          <div class="h-2 w-full" />
        </svelte:fragment>
      </IntersectionObserver>
    </div>
  </div>
</ProfileLayout>
