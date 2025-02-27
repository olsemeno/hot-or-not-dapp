<script lang="ts">
import Button from '$components/button/Button.svelte'
import IntersectionObserver from '$components/intersection-observer/IntersectionObserver.svelte'
import {
  fetchSpeculations,
  type PostPopulatedWithBetDetails,
} from '$lib/helpers/profile'
import Log from '$lib/utils/Log'
import { onMount } from 'svelte'
import SpeculationPost from './SpeculationPost.svelte'
import Icon from '$components/icon/Icon.svelte'

export let me = false
export let userId = ''
export let posts: PostPopulatedWithBetDetails[] = []
export let noMorePosts = false
export let fetchedCount = 0

let loading = false
let error = false

async function loadPosts() {
  try {
    if (loading) {
      return
    }

    loading = true
    error = false
    const res = await fetchSpeculations(userId, fetchedCount)

    if (res.error) {
      error = true
      loading = false
      return
    }

    posts.push(...res.posts)
    posts = posts
    noMorePosts = res.noMorePosts
    fetchedCount = posts.length
    loading = false
    posts = posts
  } catch (e) {
    error = true
    loading = false
    Log({ error: e, from: '1 speculation loadPosts' }, 'error')
  }
}

onMount(() => loadPosts())
</script>

{#if posts.length}
  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
    {#each posts as post}
      <SpeculationPost {userId} {me} {post} />
    {/each}
  </div>
{:else if !loading && !error}
  <div
    class="flex h-full w-full flex-col items-center justify-center space-y-8 px-8">
    <Icon name="votes-graphics" class="w-32" />
    <div class="text-center text-lg font-bold">
      {#if me}
        You don't have any current votes yet
      {:else}
        This user has not placed any vote yet
      {/if}
    </div>
  </div>
{/if}
{#if error}
  <div class="flex w-full flex-col items-center justify-center space-y-2 py-8">
    <div class="flex items-center space-x-2 text-sm text-red-500">
      <Icon name="report" class="h-4 w-4" />
      <span>Error while fetching posts</span>
    </div>
    <Button on:click={loadPosts} type="secondary" class="px-6 py-2 text-xs">
      Try again
    </Button>
  </div>
{:else if loading}
  <div class="flex w-full items-center justify-center space-x-2 py-8">
    <Icon name="loading" class="h-4 w-4 animate-spin" />
    <span>Fetching posts</span>
  </div>
{/if}
{#if noMorePosts && posts.length}
  <div
    class="flex w-full items-center justify-center space-x-2 py-8 opacity-40">
    <span>No more posts</span>
  </div>
{/if}

<IntersectionObserver
  on:intersected={loadPosts}
  threshold={0.1}
  disabled={loading || error}
  intersect={!noMorePosts}>
  <svelte:fragment>
    <div class="h-4 w-full" />
  </svelte:fragment>
</IntersectionObserver>
