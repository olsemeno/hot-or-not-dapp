<script lang="ts" context="module">
type UnionKeyOf<U> = U extends U ? keyof U : never
type BetOutcome = UnionKeyOf<BetOutcomeForBetMaker>
type BetType = UnionKeyOf<BetDirection>

function getBetStatus(outcome: BetOutcomeForBetMaker): BetOutcome {
  return Object.keys(outcome)[0] as BetOutcome
}

function getBetDirection(direction: BetDirection): BetType {
  return Object.keys(direction)[0] as BetType
}
</script>

<script lang="ts">
import type {
  BetDirection,
  BetOutcomeForBetMaker,
  PlacedBetDetail,
  SystemTime,
} from '$canisters/individual_user_template/individual_user_template.did'
import { fade } from 'svelte/transition'
import c from 'clsx'
import { getMsLeftForBetResult } from '$lib/utils/timeLeft'
import type { Readable } from 'svelte/store'
import { pluralize } from '$lib/utils/pluralize'
import Icon from '$components/icon/Icon.svelte'

export let placedBetDetail: PlacedBetDetail | undefined = undefined
export let postCreatedAt: SystemTime | undefined = undefined
export let me = false

let betOutcome: BetOutcome = 'AwaitingResult'
let betDirection: BetType = 'Hot'
let amountBet: number = 10
let timeLeft: Readable<string>

$: YOU = me ? 'You' : 'User'

$: if (placedBetDetail) {
  betOutcome = getBetStatus(placedBetDetail.outcome_received)
  betDirection = getBetDirection(placedBetDetail.bet_direction)
  amountBet = Number(placedBetDetail.amount_bet)
  if (postCreatedAt) {
    timeLeft = getMsLeftForBetResult(placedBetDetail.slot_id, postCreatedAt)
  }
}
</script>

<div
  transition:fade|local
  class="flex h-full w-full items-center space-x-8 px-4">
  <div
    class={c('flex items-center', {
      'translate-y-4 -space-x-8 -space-y-8': betOutcome !== 'AwaitingResult',
      'space-x-2': betOutcome === 'AwaitingResult',
    })}>
    <div class="z-[2] shrink-0">
      {#if betDirection === 'Hot'}
        <Icon name="hot-logo" class="h-16 w-16" />
      {:else if betDirection === 'Not'}
        <Icon name="not-logo" class="h-16 w-16" />
      {/if}
    </div>
    <div class="relative z-[1] h-16 w-16 shrink-0">
      <Icon name="coin-face" class="h-16 w-16" />
      <span
        style="text-shadow: 3px 3px 0 #EA9C00;"
        class="absolute inset-0 flex select-none items-center justify-center text-2xl font-extrabold text-[#ffeea8]">
        {amountBet}
      </span>
    </div>
  </div>
  {#if betOutcome === 'AwaitingResult'}
    <div class="flex grow flex-col space-y-2">
      <span class="whitespace-normal text-xs">
        {YOU} staked
        <strong>{amountBet}</strong>
        tokens on
        <strong>{betDirection}.</strong>
        Result is still pending.
      </span>
      {#if timeLeft}
        <div
          class="flex grow items-center justify-center space-x-2 rounded-full bg-primary px-3 py-2 shadow-button-primary">
          <Icon name="stopwatch" class="h-5 w-5" />
          <span class="font-bold text-white">{$timeLeft}</span>
        </div>
      {/if}
    </div>
  {:else}
    {@const outcomeAmount =
      Number(Object.values(placedBetDetail?.outcome_received || {})?.[0]) || 0}
    <div class="flex grow flex-col space-y-2">
      <span class="whitespace-normal text-xs">
        {YOU} staked
        <strong>{amountBet}</strong>
        {pluralize('token', outcomeAmount)} on
        <strong>{betDirection}.</strong>

        {#if betOutcome === 'Won' && outcomeAmount}
          {YOU} received
          <strong>{outcomeAmount}</strong>
          {pluralize('token', outcomeAmount)}.
        {/if}
        {#if betOutcome === 'Lost'}
          {YOU} lost {amountBet} {pluralize('token', outcomeAmount)}.
        {/if}
        {#if betOutcome === 'Draw' && outcomeAmount}
          {YOU} got refunded
          <strong>{outcomeAmount}</strong>
          {pluralize('token', outcomeAmount)} after deducting commission.
        {/if}
      </span>
      <div
        class={c(
          'flex items-center justify-center space-x-2 rounded-full px-3 py-2',
          {
            'bg-green-500': betOutcome === 'Won',
            'bg-red-500': betOutcome === 'Lost',
            'bg-gray-600': betOutcome === 'Draw',
          },
        )}>
        <span class="font-bold text-white">
          {betOutcome != 'Draw' && me ? 'You' : ''}
          {betOutcome}
        </span>
      </div>
    </div>
  {/if}
</div>
