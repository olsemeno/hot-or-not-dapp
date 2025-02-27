<script lang="ts">
import '../css/app.css'
import { onMount } from 'svelte'
import { authState } from '$stores/auth'
import LoginPopup from '$components/login/LoginPopup.svelte'
import Log from '$lib/utils/Log'
import { beforeNavigate } from '$app/navigation'
import { navigateBack, navigationHistory } from '$stores/navigation'
import { registerEvent } from '$components/analytics/GA.svelte'
import userProfile from '$stores/userProfile'
import { initializeAuthClient } from '$lib/helpers/auth'
import { page } from '$app/stores'
import { deferredPrompt } from '$stores/deferredPrompt'
import NetworkStatus from '$components/network-status/NetworkStatus.svelte'

const ignoredPaths = ['edit', 'lovers', 'post', 'speculations']

async function initSentry() {
  const Sentry = await import('@sentry/svelte')
  const { BrowserTracing } = await await import('@sentry/tracing')

  Sentry.init({
    dsn: 'https://7586a69b01314524b31c8f4f64b41988@o4504076385124352.ingest.sentry.io/4504076386238464',
    integrations: [new BrowserTracing(), new Sentry.Replay()],
    environment: $page.url.host.includes('t:') ? 'localDev' : 'production',
    replaysSessionSampleRate: 0.3,
    replaysOnErrorSampleRate: 1,
    ignoreErrors: [
      /Adding invalid event/i, // Replay Error
      /Error in compression worker/i, // Replay Error
      /e.getLastBreadcrumb/i, // Sentry error
      /chrome-extension/i, // Chrome extensions error
      /_ is not defined/i, //Unknown error
    ],
    beforeSend: $page.url.host.includes('t:')
      ? (event) => {
          console.log('[SENTRY LOG]', event)
          return event
        }
      : undefined,
  })
  Sentry.makeMain(Sentry.getCurrentHub())
  Log('Sentry Initialized', 'info')
}

function registerServiceWorker() {
  if ($page.url.host.includes('t:')) return

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
  }
}

let GA: any
async function initializeGA() {
  try {
    GA = (await import('$components/analytics/GA.svelte')).default
  } catch (_) {
    Log('GA Blocked', 'warn')
  }
}

function listenForUnhandledRejections() {
  window.addEventListener('unhandledrejection', (e) => {
    // Handle app-crash level errors here
    Log({ e, type: 'unhandled' }, 'error')
  })
}

onMount(() => {
  try {
    $navigateBack = null
    initSentry()
    listenForUnhandledRejections()
    initializeAuthClient()
    registerServiceWorker()
    initializeGA()
  } catch (e) {
    Log({ error: e, source: '1 layout' }, 'error')
  }
})

beforeNavigate(({ from, to, type }) => {
  if (type === 'popstate') return

  if (to?.url.pathname) {
    $navigationHistory.push(to.url.pathname)
  }
  if (
    ignoredPaths.some((path) => from?.url.pathname.includes(path)) ||
    ignoredPaths.some((path) => to?.url.pathname.includes(path))
  )
    return
  $navigateBack = from?.url.pathname ?? null
})
</script>

<svelte:window
  on:appinstalled={() => {
    registerEvent('pwa_installed', {
      canister_id: $authState.userCanisterId,
      userId: $userProfile.principal_id,
    })
  }}
  on:beforeinstallprompt={(e) => {
    deferredPrompt.set(e)
  }} />

<NetworkStatus />

<alpha-ribbon
  class="pointer-events-none absolute -right-10 top-2 z-[50] flex w-28 rotate-45 items-center justify-center overflow-hidden bg-primary px-1 py-0.5 text-[0.5rem] font-bold uppercase text-white opacity-60">
  Alpha
</alpha-ribbon>

{#if $authState.showLogin}
  <LoginPopup />
{/if}

<div class="safe-bottom relative h-full w-full overflow-hidden overflow-y-auto">
  <slot />
</div>

{#if GA}
  <svelte:component this={GA} />
{/if}
