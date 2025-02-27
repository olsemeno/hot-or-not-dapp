<script lang="ts" context="module">
import type { BetDirection } from '$canisters/individual_user_template/individual_user_template.did'

type UnionKeyOf<U> = U extends U ? keyof U : never
export type VoteDirectionString = UnionKeyOf<BetDirection>

export type PlaceVote = {
  coins: number
  direction: VoteDirectionString
}
</script>

<script lang="ts">
import IconButton from '$components/button/IconButton.svelte'
import { playerState } from '$stores/playerState'
import c from 'clsx'
import { createEventDispatcher } from 'svelte'
import { fade } from 'svelte/transition'
import Icon from '$components/icon/Icon.svelte'

export let tutorialMode: {
  highlightCoin: boolean
  highlightSelectors: boolean
} = {
  highlightCoin: false,
  highlightSelectors: false,
}
export let loadingWithDirection: false | VoteDirectionString = false
export let disabled = false
export let error = ''
export let votePlaced: false | VoteDirectionString = false

$: _tutorialMode = tutorialMode.highlightCoin || tutorialMode.highlightSelectors

const dispatch = createEventDispatcher<{
  placeVote: PlaceVote
}>()

function increaseCoins() {
  if ($playerState.selectedCoins == 10) $playerState.selectedCoins = 50
  else if ($playerState.selectedCoins == 50) $playerState.selectedCoins = 100
}

function decreaseCoins() {
  if ($playerState.selectedCoins == 50) $playerState.selectedCoins = 10
  else if ($playerState.selectedCoins == 100) $playerState.selectedCoins = 50
}

function toggleVote() {
  if ($playerState.selectedCoins == 100) $playerState.selectedCoins = 10
  else increaseCoins()
}

function placeVote(direction: 'Hot' | 'Not') {
  dispatch('placeVote', {
    direction,
    coins: $playerState.selectedCoins,
  })
}
</script>

<div
  class="pointer-events-none absolute inset-0 top-0 flex items-center justify-center space-x-12 px-4"
  transition:fade|local>
  <div
    class={c(
      'relative flex flex-col items-center space-y-1',
      error || _tutorialMode ? '!pointer-events-none' : 'pointer-events-auto',
    )}>
    {#if tutorialMode.highlightSelectors}
      <div class="absolute -top-2 z-[-1] h-36 w-36 rounded-full bg-white/10" />
    {/if}
    <IconButton
      disabled={disabled || tutorialMode.highlightCoin}
      iconName="not-logo"
      iconClass={c('h-24 w-24 transition-transform', {
        'scale-110': loadingWithDirection === 'Not',
        'scale-90 grayscale': loadingWithDirection === 'Hot',
      })}
      on:click={(e) => {
        e.stopImmediatePropagation()
        placeVote('Not')
      }} />
    <span class="text-sm">Not</span>
  </div>
  <div
    class={c(
      'relative flex flex-col items-center',
      _tutorialMode || error ? '!pointer-events-none' : 'pointer-events-auto',
    )}>
    <IconButton
      iconName="chevron-up"
      iconClass="h-2 w-2"
      disabled={$playerState.selectedCoins == 100 || disabled || _tutorialMode}
      on:click={(e) => {
        e.stopImmediatePropagation()
        increaseCoins()
      }}
      class={c('z-[10] flex items-center p-4 disabled:opacity-50', {
        invisible: votePlaced || loadingWithDirection,
      })} />
    {#if tutorialMode.highlightCoin}
      <div class="absolute top-2 z-[-1] h-36 w-36 rounded-full bg-white/10" />
    {/if}
    <button
      disabled={votePlaced !== false ||
        loadingWithDirection !== false ||
        disabled}
      on:click|stopPropagation={toggleVote}
      class={c('relative h-20 w-20 select-none', {
        grayscale:
          tutorialMode.highlightSelectors || votePlaced !== false || disabled,
      })}>
      <Icon name="coin-face" class="h-20 w-20" />
      <div
        class="absolute inset-0 flex select-none items-center justify-center">
        {#if loadingWithDirection}
          <Icon name="loading" class="h-8 w-8 animate-spin" />
        {:else}
          <span
            style="text-shadow: 3px 3px 0 #EA9C00;"
            class="select-none text-3xl font-extrabold text-[#FFCC00]">
            {$playerState.selectedCoins}
          </span>
        {/if}
      </div>
    </button>
    <IconButton
      iconName="chevron-up"
      iconClass="h-2 w-2 rotate-180"
      on:click={(e) => {
        e.stopImmediatePropagation()
        decreaseCoins()
      }}
      disabled={$playerState.selectedCoins == 10 || disabled || _tutorialMode}
      class={c('z-[10] flex items-center p-4 disabled:opacity-50', {
        invisible: votePlaced || loadingWithDirection,
      })} />
  </div>
  <div
    class={c(
      'relative flex flex-col items-center space-y-1',
      error || _tutorialMode ? '!pointer-events-none' : 'pointer-events-auto',
    )}>
    {#if tutorialMode.highlightSelectors}
      <div class="absolute -top-2 z-[-1] h-36 w-36 rounded-full bg-white/10" />
    {/if}
    <IconButton
      iconName="hot-logo"
      iconClass={c('h-24 w-24 transition-transform', {
        'scale-110': loadingWithDirection === 'Hot',
        'scale-90 grayscale': loadingWithDirection === 'Not',
      })}
      class="z-2"
      disabled={disabled || tutorialMode.highlightCoin}
      on:click={(e) => {
        e.stopImmediatePropagation()
        placeVote('Hot')
      }} />
    <span class="text-sm">Hot</span>
  </div>
</div>
