<script lang="ts">
import IconButton from '$components/button/IconButton.svelte'
import CameraLayout from '$components/layout/CameraLayout.svelte'
import {
  applyConstraintsOnVideoStream,
  getDevicesList,
  getMediaStream,
} from '$lib/helpers/camera'
import { onMount, tick, onDestroy } from 'svelte'
import { fade } from 'svelte/transition'
import c from 'clsx'
import { allFilters, getFilterCss } from '$lib/utils/filtersMap'
import { debounce } from 'throttle-debounce'
import { fileToUpload } from '$stores/fileUpload'
import { goto } from '$app/navigation'
import { isiPhone } from '$lib/utils/isSafari'
import type { CameraControls } from '$components/upload/UploadTypes'
import Popup from '$components/popup/Popup.svelte'
import Button from '$components/button/Button.svelte'
import { linear } from 'svelte/easing'
import { tweened, type Tweened } from 'svelte/motion'
import Log from '$lib/utils/Log'
import Icon from '$components/icon/Icon.svelte'

let videoEl: HTMLVideoElement
let mediaStream: MediaStream
let inputEl: HTMLInputElement
let initState: 'init' | 'denied' | 'allowed' = 'init'
let timerInterval: any = undefined
let timerCountdown = 0
let recordingProgress: Tweened<number> | undefined = tweened(0, {
  duration: 1000,
  easing: linear,
})
let canvasEl: HTMLCanvasElement | undefined = undefined
let cameraEl: HTMLElement
let filtersEl: HTMLElement
let selectedFilter: keyof typeof allFilters | 'clear' = 'clear'
let recordStream: MediaStream
let mediaRecorder: MediaRecorder
let recordedChunks: Blob[] = []
let captureInterval: any | undefined = undefined
let recording = false
let useCanvas = false
let loading = false
let recordingInterval: any
let recordingSeconds = 0
let invalidFileSelected = {
  show: false,
  error: 'size',
}
let audioTrack: MediaStreamTrack | undefined = undefined

const MAX_RECORDING_SECONDS = 60
const filterPreviewImage =
  'https://images.unsplash.com/photo-1563982291479-585982ec57b6?w=320&q=80&fm=jpg&crop=entropy&cs=tinysrgb'

let cameraControls: CameraControls = {
  flash: 'flash',
  flip: {
    show: false,
    facingMode: 'user',
  },
  timer: 'off',
}

$: mediaStream && updateVideoStream()

async function updateVideoStream() {
  initState = 'allowed'
  await tick()
  videoEl.srcObject = mediaStream
}

async function checkLoadedVideo(videoEl: HTMLVideoElement, file: File) {
  if (videoEl.duration && videoEl.duration > 1) {
    if (videoEl.duration > 60) {
      invalidFileSelected = {
        show: true,
        error: 'length',
      }
      loading = false
    } else {
      Log(
        {
          res: 'Selected file is fine. Proceeding',
          source: '0 checkFileSelected',
        },
        'info',
      )
      $fileToUpload = file
      await videoEl.pause()
      goto('/upload/new')
    }
  } else {
    invalidFileSelected = {
      show: true,
      error: 'other',
    }
    loading = false
  }
  URL.revokeObjectURL(videoEl.src)
}

function checkInput(files: FileList | null) {
  loading = true
  if (files && files[0]) {
    if (files[0].size / 1024 / 1024 > 200) {
      //file is larger than 200 MiB
      invalidFileSelected = {
        show: true,
        error: 'size',
      }
      loading = false
      return
    }
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.src = URL.createObjectURL(files[0])
    videoEl.onloadedmetadata = () => checkLoadedVideo(videoEl, files[0])
  }
}

function toggleTimer() {
  if (cameraControls.timer === 'off') cameraControls.timer = '5s'
  else if (cameraControls.timer === '5s') cameraControls.timer = '10s'
  else cameraControls.timer = 'off'
}

async function switchCamera() {
  cameraControls.flip.facingMode =
    cameraControls.flip.facingMode === 'user' ? 'environment' : 'user'
  if (
    cameraControls.flash !== 'flash-not-available' &&
    cameraControls.flash !== 'hide'
  ) {
    await toggleTorch()
  }
  await requestMediaAccess()
}

async function toggleTorch() {
  const success = await applyConstraintsOnVideoStream(mediaStream, {
    advanced: [{ torch: cameraControls.flash === 'flash-fill' ? false : true }],
  })
  if (success) {
    cameraControls.flash =
      cameraControls.flash === 'flash-fill' ? 'flash' : 'flash-fill'
  }
}

async function checkIfFlashAvailable() {
  try {
    const imageCapture = new ImageCapture(mediaStream.getVideoTracks()[0])
    const capablities = await imageCapture.getPhotoCapabilities()
    cameraControls.flash = capablities.fillLightMode
      ? 'flash'
      : 'flash-not-available'
  } catch (e) {
    console.warn('flash not available on this device')
    cameraControls.flash = 'hide'
  }
}

async function checkIfFlipAvailable() {
  const { videoDevices } = await getDevicesList()
  cameraControls.flip.show =
    videoDevices && videoDevices.length > 1 ? true : false
}

async function requestMediaAccess() {
  try {
    if (mediaStream) {
      const tracks = mediaStream.getTracks()
      tracks.forEach((track) => track.stop())
    }
    const res = await getMediaStream(cameraControls.flip.facingMode)
    if (res.error == 'none' && res.stream) {
      mediaStream = res.stream
      audioTrack = res.stream.getAudioTracks()[0]

      await tick()

      updateCanvas(
        mediaStream.getVideoTracks()[0].getSettings().height ||
          window.innerHeight,
        mediaStream.getVideoTracks()[0].getSettings().width ||
          window.innerWidth,
      )

      await checkIfFlashAvailable()
      await checkIfFlipAvailable()
    } else {
      initState = 'denied'
    }
  } catch (e) {
    Log({ error: e, source: '1 requestMediaAccess' }, 'error')
  }
}

function setTimer() {
  timerInterval = setInterval(() => {
    timerCountdown--
    if (timerCountdown == 0) {
      clearInterval(timerInterval)
      timerInterval = undefined
      startRecording(true)
    }
  }, 1000)
}

async function startRecording(ignoreTimer = false) {
  try {
    if (recording) {
      recording = false
      clearInterval(recordingInterval)
      timerInterval = undefined
      recordingProgress = undefined
      await tick()
      mediaRecorder.stop()
    } else if (cameraControls.timer !== 'off' && !ignoreTimer) {
      timerCountdown = cameraControls.timer === '5s' ? 5 : 10
      setTimer()
    } else {
      if (useCanvas && canvasEl) {
        recordStream = canvasEl.captureStream(30)
        audioTrack && recordStream.addTrack(audioTrack)
      } else recordStream = mediaStream
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/mp4;'
      mediaRecorder = new MediaRecorder(recordStream, { mimeType })
      mediaRecorder.ondataavailable = handleDataAvailable
      recordingInterval = setInterval(() => {
        if (recordingSeconds < MAX_RECORDING_SECONDS) {
          recordingSeconds++
          recordingProgress?.set(
            (recordingSeconds / MAX_RECORDING_SECONDS) * 100,
          )
        } else {
          startRecording()
          clearInterval(recordingInterval)
        }
      }, 1000)
      mediaRecorder.start()
      recording = true
    }
  } catch (e) {
    Log({ error: e, source: '1 startRecording' }, 'error')
  }
}

function handleDataAvailable(event: any) {
  if (event.data.size > 0) {
    loading = true
    recordedChunks.push(event.data)
    const type = MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4;'
    $fileToUpload = new Blob(recordedChunks, {
      type,
    })
    goto('/upload/new')
  } else {
    Log(
      {
        res: 'Video recorded, Data not available',
        source: '1 handleDataAvailable',
      },
      'error',
    )
  }
}

async function updateCanvas(height: number, width: number) {
  if (useCanvas && canvasEl) {
    canvasEl.height = height
    canvasEl.width = width
    if (!captureInterval) startCapturing()
  }
}

function computeFrame() {
  try {
    const ctx = canvasEl?.getContext('2d', { willReadFrequently: true })
    if (canvasEl && ctx) {
      ctx.drawImage(
        videoEl,
        0,
        0,
        canvasEl.width,
        canvasEl.height,
        0,
        0,
        canvasEl.width,
        canvasEl.height,
      )
      const frame = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)
      if (selectedFilter != 'clear') ctx.filter = getFilterCss(selectedFilter)
      else ctx.filter = ''
      ctx.putImageData(frame, 0, 0)
    }
  } catch (e) {
    Log({ error: e, source: '1 computeFrame' }, 'error')
  }
}

function startCapturing() {
  captureInterval = setInterval(computeFrame, 33.34) // 33.34ms is == 30 fps
}

const checkWhichEl = debounce(500, async () => {
  await tick()
  if (filtersEl && cameraEl) {
    const captureArea = cameraEl.getBoundingClientRect()
    for (let i = 0; i < filtersEl.children.length - 1; i++) {
      const filterEl = filtersEl.children[i].getBoundingClientRect()
      if (
        filterEl.left > captureArea.left &&
        captureArea.right > filterEl.right
      ) {
        const filterElSelected =
          filtersEl.children[i].getAttribute('data-filter')
        selectedFilter = filterElSelected ?? 'clear'
        break
      }
    }
  }
})

async function checkClickAndStartRecording(e: MouseEvent) {
  await tick()
  const captureArea = cameraEl?.getBoundingClientRect()
  if (
    captureArea &&
    e.x > captureArea.left &&
    e.x < captureArea.right &&
    e.y > captureArea.top &&
    e.y < captureArea.bottom
  ) {
    startRecording()
  }
}

onMount(async () => {
  useCanvas = !isiPhone()
  await requestMediaAccess()
})

onDestroy(async () => {
  if (cameraControls.flash == 'flash-fill') {
    await toggleTorch()
  }
  if (mediaStream) {
    const tracks = mediaStream.getTracks()
    tracks.forEach((track) => track.stop())
  }
  captureInterval && clearInterval(captureInterval)
  timerInterval && clearInterval(timerInterval)
  recordingInterval && clearInterval(recordingInterval)
})
</script>

<svelte:head>
  <title>Create | Hot or Not</title>
</svelte:head>

<CameraLayout>
  <svelte:fragment slot="content">
    <div class="realtive h-full w-full bg-black">
      {#if initState != 'allowed'}
        <div
          transition:fade|local
          class="flex h-full flex-col items-center justify-center space-y-8 px-10">
          <Icon name="camera-graphic" class="h-56 w-56" />

          <span class="font-semibold">Enable Camera Access</span>
          <span class="text-center text-white/60">
            Please provide access to the camera, which is required for recording
            video
          </span>
        </div>
      {:else}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
          autoplay
          muted
          bind:this={videoEl}
          playsinline
          style={!useCanvas
            ? cameraControls.flip.facingMode === 'user'
              ? 'transform: scaleX(-1);'
              : ''
            : ''}
          class="absolute z-[4] w-full object-cover object-center {useCanvas
            ? ''
            : 'h-full'}" />
        {#if timerInterval}
          {#key timerCountdown}
            <div
              in:fade|local={{ duration: 500, delay: 100 }}
              out:fade|local={{ duration: 100 }}
              class={c(
                'absolute z-[6] flex h-full w-full items-center justify-center bg-transparent text-9xl font-bold',
                timerCountdown > 3 ? 'text-white' : 'text-primary',
              )}>
              {timerCountdown}
            </div>
          {/key}
        {/if}
        {#if useCanvas}
          <div
            class="absolute z-[5] flex h-full w-full items-center justify-center">
            <canvas bind:this={canvasEl} class="h-full" />
          </div>
        {/if}
      {/if}
    </div>
  </svelte:fragment>
  <div
    class="pointer-events-auto relative flex w-full items-start justify-end px-5"
    slot="top">
    {#if recording}
      <div class="absolute left-4 right-4 top-4 h-2 rounded-full bg-white px-5">
        <div
          style="width: {$recordingProgress}%"
          class="absolute left-0 top-0 h-full max-w-full rounded-full bg-primary" />
      </div>
    {:else}
      <IconButton
        iconName="close"
        iconClass="h-6 w-6 text-white"
        href="/feed"
        preload
        class="h-10 w-10 rounded-full bg-black/50" />
    {/if}
  </div>
  <svelte:fragment slot="bottom-camera-controls">
    {#if initState == 'allowed'}
      <!-- Snap Point -->
      <div transition:fade|local class="flex items-end justify-start pt-3">
        <button
          bind:this={cameraEl}
          on:click={() => !loading && startRecording()}
          class={c(
            'relative mx-auto flex h-14 w-14 select-none items-center justify-center rounded-full ring-8 ring-white/50 transition-all duration-300',
            recording ? 'z-[5] bg-red-500' : 'bg-white',
          )}>
          <div class="h-4 w-4 rounded-sm bg-white" />
          {#if loading}
            <Icon
              name="loading"
              class="absolute mx-auto h-8 w-8 animate-spin-slow text-primary" />
          {/if}
        </button>
      </div>
      {#if !recording && useCanvas}
        <button
          on:click={(e) => !loading && checkClickAndStartRecording(e)}
          transition:fade|local
          bind:this={filtersEl}
          on:scroll={checkWhichEl}
          class="hide-scrollbar absolute bottom-4 -mt-20 flex w-full select-none snap-x snap-mandatory gap-6 overflow-x-auto">
          <!-- Begin Dumb item -->
          <div data-filter="clear" class="shrink-0 snap-center">
            <div class="w-dumb-start shrink-0" />
          </div>
          <!-- End Dumb item -->
          {#each Object.keys(allFilters) as filter}
            <div
              draggable="false"
              data-filter={filter}
              class="relative flex h-16 shrink-0 select-none snap-center snap-always items-start">
              <img
                draggable="false"
                style="filter: {getFilterCss(
                  filter,
                )}; -webkit-touch-callout: none;"
                alt={filter}
                src={filterPreviewImage}
                class="h-12 w-12 rounded-full" />
              <div
                class="{filter == selectedFilter
                  ? 'opacity-0'
                  : 'opacity-100'} absolute inset-x-0 bottom-0 z-[10] flex items-center justify-center transition-opacity duration-200">
                <span class="text-xs capitalize text-white">
                  {filter}
                </span>
              </div>
            </div>
          {/each}

          <div data-filter="clear" class="shrink-0 snap-center">
            <div class="w-dumb-end shrink-0" />
          </div>
        </button>
      {/if}
    {/if}
  </svelte:fragment>

  <div
    class="pointer-events-auto flex h-full select-none flex-col items-center justify-center"
    slot="right-camera-controls">
    {#if initState == 'allowed'}
      <div class="flex flex-col space-y-6 rounded-full bg-black/50 p-3">
        {#if cameraControls.flash !== 'hide'}
          <div class="flex flex-col items-center justify-center space-y-1">
            <IconButton
              iconName={cameraControls.flash}
              iconClass="h-5 w-5"
              on:click={toggleTorch}
              disabled={cameraControls.flash === 'flash-not-available'}
              class={c(
                'flex h-10 w-10 items-center justify-center rounded-full',
                cameraControls.flash === 'flash-fill'
                  ? 'bg-white text-primary'
                  : 'bg-black text-white',
              )} />
            <span class="text-xs">Flash</span>
          </div>
        {/if}
        {#if cameraControls.flip.show}
          {@const disabled =
            !cameraControls.flip.show || (recording && !useCanvas)}
          <div class="flex flex-col items-center justify-center space-y-1">
            <IconButton
              iconName={disabled ? 'flip-not-available' : 'flip'}
              iconClass="h-4 w-4 text-white"
              {disabled}
              on:click={switchCamera}
              class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50" />
            <span class="text-xs">Flip</span>
          </div>
        {/if}
        <div class="flex flex-col items-center justify-center space-y-1">
          <IconButton
            iconName={recording ? 'stopwatch-not-available' : 'stopwatch'}
            iconClass="h-5 w-5 {cameraControls.timer === 'off' ? '' : 'hidden'}"
            disabled={recording}
            on:click={toggleTimer}
            class={c(
              'flex h-10 w-10 items-center justify-center rounded-full',
              {
                'bg-black/50 text-white': cameraControls.timer === 'off',
                'bg-white text-primary': cameraControls.timer !== 'off',
              },
            )}>
            {#if cameraControls.timer !== 'off'}
              {cameraControls.timer}
            {/if}
          </IconButton>
          <span class="text-xs">Timer</span>
        </div>
      </div>
    {/if}
  </div>
  <div
    class="flex h-full w-full items-center justify-center space-x-16 bg-black/80 transition-all duration-200 {recording
      ? 'opacity-0'
      : ''}"
    slot="bottom-navigation">
    <button
      class="pb-2 focus:outline-none active:border-b-4 active:border-primary active:pb-1"
      on:click={() => inputEl.click()}>
      Gallery
    </button>
    <div class="relative">
      <button class="border-b-4 border-primary pb-1 focus:outline-none">
        Camera
      </button>
    </div>
  </div>
</CameraLayout>

<input
  type="file"
  accept="video/*"
  disabled={loading || recording}
  bind:this={inputEl}
  class="hidden"
  on:change={(e) => checkInput(e.currentTarget.files)} />

<Popup
  showCloseButton
  on:close={() => (inputEl.value = '')}
  bind:show={invalidFileSelected.show}>
  <div class="flex flex-col space-y-4">
    <div>
      {#if invalidFileSelected.error === 'size'}
        The video you selected is larger than 200MB. Please select a smaller
        video
      {:else if invalidFileSelected.error === 'length'}
        The video you selected is longer than 1 minute. Please select a shorter
        video
      {:else}
        Something went wrong selecting the video. Please try again
      {/if}
    </div>
    <Button
      on:click={() => {
        invalidFileSelected.show = false
        inputEl.value = ''
      }}>
      Okay
    </Button>
  </div>
</Popup>

<style>
.w-dumb-start {
  width: calc((100vw / 2) + 2rem);
}

.w-dumb-end {
  width: calc((100vw / 2) - 3rem);
}
</style>
