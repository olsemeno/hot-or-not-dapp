<script lang="ts">
import Icon from '$components/icon/Icon.svelte'
import { getHlsUrl, getMp4Url } from '$lib/utils/cloudflare'
import { isiPhone } from '$lib/utils/isSafari'
import Log from '$lib/utils/Log'
import { playerState } from '$stores/playerState'
import type Hls from 'hls.js'
import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
import { debounce, throttle } from 'throttle-debounce'

export let uid: string
export let index: number
export let inView = false
export let thumbnail = ''
export let Hls: any
export let playFormat: 'hls' | 'mp4'

let ios = isiPhone()

const dispatch = createEventDispatcher<{
  watchedPercentage: number
  loaded: void
  videoUnavailable: void
  watchComplete: void
}>()

let videoEl: HTMLVideoElement
let currentTime = 0
let duration = 0
let loaded = false
let hls: Hls | null = null
let waiting = false
let playing = true
let videoUnavailable = false
let watchingNow = false
let watchedDispatchLock = true

export const checkVideoIsPlaying = debounce(
  500,
  async () => {
    await tick()
    if (videoEl?.paused) {
      playing = false
    } else if (videoEl) {
      playing = true
      videoEl.volume = 1
    }
  },
  {
    atBegin: false,
  },
)

export const stop = debounce(
  1000,
  async () => {
    try {
      await tick()
      if (videoEl) {
        videoEl.volume = 0
        videoEl.currentTime = 0.05
        videoEl.pause()
      }
    } catch (e: any) {
      Log(
        { error: e, index, uid, playFormat, inView, source: '2 play' },
        'error',
      )
    }
  },
  { atBegin: true },
)

export const play = debounce(
  1000,
  async () => {
    await tick()
    if (videoEl?.paused) {
      if (ios) {
        videoEl.volume = 0
      } else if (videoEl) {
        videoEl.muted = $playerState.muted
      }
      if (videoEl) {
        videoEl
          .play()
          .then(() => {
            videoEl.volume = 1
            playing = true
            checkVideoIsPlaying()
          })
          .catch(() => {
            playing = false
          })
      }
    }
  },
  { atBegin: true },
)

async function handleClick() {
  try {
    await tick()
    if (videoEl) {
      if (!$playerState.initialized) {
        $playerState.initialized = true
      }
      if (videoEl.paused) {
        videoEl
          .play()
          .then(() => {
            playing = true
          })
          .catch(() => {
            playing = false
          })
        $playerState.muted = false
        videoEl.muted = false
      } else if (videoEl) {
        $playerState.muted = !$playerState.muted
        videoEl.muted = $playerState.muted
      }
    }
  } catch (e) {
    Log(
      { error: e, index, uid, playFormat, inView, source: '1 handleClick' },
      'error',
    )
  }
}

const dispatchWatchedPercentage = throttle(250, (progress: number) => {
  dispatch('watchedPercentage', progress)
})

$: watchedPercentage = (currentTime / duration) * 100
$: watchedPercentage > 2 && watchedDispatchLock && (watchedDispatchLock = false)

$: if (inView && !videoEl?.paused && !watchedDispatchLock) {
  dispatchWatchedPercentage(watchedPercentage)
}

$: if (inView && loaded) {
  dispatch('loaded')
  if (videoEl?.paused) {
    play()
  }
  if (!watchingNow) {
    watchingNow = true
  }
}

$: if (!inView) {
  stop()
  if (watchingNow) {
    watchingNow = false
    watchedDispatchLock = true
    dispatch('watchComplete')
  }
}

onMount(() => {
  if (playFormat === 'mp4' || ios) {
    //Force mp4 playback on iOS
    videoEl.src = `${getMp4Url(uid)}${ios ? '#t=0.1' : ''}`
  } else {
    const src = getHlsUrl(uid)
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = src + '#t=0.1'
    } else if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 5 })
      hls?.loadSource(src)
      hls?.attachMedia(videoEl)
      hls?.on(Hls.Events.ERROR, function (event, data) {
        if (data?.response?.code == 404) {
          videoUnavailable = true
          dispatch('videoUnavailable')
        }
      })
    } else {
      // Fallback to mp4
      videoEl.src = `${getMp4Url(uid)}${ios ? '#t=0.1' : ''}`
      Log(
        { error: 'Hls not supported', index, src, source: '1 videoPlayer' },
        'warn',
      )
    }
  }
})

onDestroy(() => {
  if (hls && hls.destroy) {
    hls.destroy()
  }
})
</script>

<video
  on:click={handleClick}
  on:waiting={() => {
    waiting = true
  }}
  on:playing={() => {
    waiting = false
    loaded = true
  }}
  on:canplay={() => {
    loaded = true
  }}
  on:pause={() => {
    inView && play()
  }}
  bind:this={videoEl}
  loop
  data-index={index}
  muted={$playerState.muted}
  disablepictureinpicture
  disableremoteplayback
  playsinline
  bind:currentTime
  bind:duration
  preload={ios ? 'metadata' : 'auto'}
  poster={thumbnail}
  class="object-fit absolute z-[3] h-full w-full" />

{#if videoUnavailable}
  <div
    class="absolute inset-0 z-[6] flex flex-col items-center justify-center space-y-3 px-8">
    <Icon name="cloud-not-available" class="h-12 w-12" />
    <div class="font-bold">Video unavailable</div>
    <div class="text-center text-sm">
      This video was removed due to content policy ToS
    </div>
  </div>
{:else if $playerState.muted || !playing}
  <div class="fade-in max-w-16 pointer-events-none absolute inset-0 z-[5]">
    <div class="flex h-full items-center justify-center">
      {#if !playing}
        <Icon
          name="play"
          class="breathe h-16 w-16 text-white/90 drop-shadow-lg" />
      {:else if $playerState.muted}
        <Icon
          name="speaker-max"
          class="breathe h-16 w-16 text-white/90 drop-shadow-lg" />
      {/if}
    </div>
  </div>
{/if}

{#if !loaded || waiting}
  <Icon
    name="loading"
    class="absolute left-6 top-6 z-[5] h-6 w-6 animate-spin-slow text-white" />
{/if}
