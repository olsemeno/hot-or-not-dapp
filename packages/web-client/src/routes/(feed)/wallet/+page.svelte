<script lang="ts">
import Icon from '$components/icon/Icon.svelte'
import LoginButton from '$components/login/LoginButton.svelte'
import TransactionItem from '$components/wallet/TransactionItem.svelte'
import {
  fetchHistory,
  fetchTokenBalance,
  type TransactionHistory,
} from '$lib/helpers/profile'
import { authState } from '$stores/auth'
import { loadingAuthStatus } from '$stores/loading'
import userProfile from '$stores/userProfile'

let loadBalanced = true
let loadList = true

let errorBalance = false
let errorList = false

let endOfList = false
let tokenBalance = 0
let history: TransactionHistory[] = []

$: loggedIn = $authState.isLoggedIn && !$loadingAuthStatus

async function refreshTokenBalance() {
  loadBalanced = true
  const res = await fetchTokenBalance()
  if (res.error) {
    errorBalance = true
  } else {
    tokenBalance = res.balance
  }
  loadBalanced = false
}

async function loadHistory() {
  if (endOfList) {
    return
  }

  loadList = true
  errorList = false
  const res = await fetchHistory(history.length)

  if (res.error) {
    errorList = true
    loadList = false
    return
  }

  history.push(...res.history)
  history = history

  endOfList = res.endOfList
  loadList = false
}

function init() {
  refreshTokenBalance()
  loadHistory()
}

$: loggedIn && init()
</script>

<svelte:head>
  <title>Wallet | Hot or Not</title>
</svelte:head>

{#if !loggedIn}
  <div
    class="flex h-full w-full flex-col items-center justify-center space-y-2">
    <div class="text-center text-sm opacity-70">
      Please login to access your wallet
    </div>
    <LoginButton />
  </div>
{:else}
  <div class="flex h-full w-full flex-col overflow-hidden overflow-y-auto">
    <div class="flex items-center justify-between p-6">
      <div class="flex grow flex-col space-y-1">
        <div class="text-sm">Welcome!</div>
        <div class="text-md font-bold">{$userProfile.display_name}</div>
      </div>
      <img
        class="h-12 w-12 rounded-full object-cover"
        alt={$userProfile.display_name}
        src={$userProfile.profile_picture_url} />
    </div>
    <div
      class="flex w-full flex-col items-center justify-center space-y-1 py-4">
      <div class="text-sm uppercase">Your coins balance</div>
      {#if errorBalance}
        <div class="text-sm font-bold opacity-50">Error loading balance</div>
      {:else if loadBalanced}
        <div class="text-sm font-bold opacity-50">Loading</div>
      {:else}
        <div class="text-4xl font-bold">{tokenBalance.toLocaleString()}</div>
      {/if}
    </div>

    <!-- <div class="px-6 py-4">
			<div
				class="flex w-full items-center justify-between divide-x-2 divide-white/10 rounded-full bg-white/10 py-4 px-2">
				{#each Array(3) as _}
					<button class="flex grow flex-col items-center space-y-1">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-transparent">
							<Icon name="arrow-up" class="h-6 w-6" />
						</div>
						<div class="text-xs">Send</div>
					</button>
				{/each}
			</div>
		</div> -->
    <div class="flex justify-between px-6 pb-1 pt-4">
      <div class="text-sm">Recent Transactions</div>
      <a href="/wallet/transactions" class="text-sm opacity-50">See all</a>
    </div>
    <div
      class="flex flex-col space-y-2 divide-y-2 divide-white/10 px-6 pb-16 pt-4">
      {#if errorList}
        <div class="text-sm font-bold opacity-50">
          Error fetching transactions
        </div>
      {:else if loadList}
        <div class="text-sm font-bold opacity-50">Loading</div>
      {:else}
        {#each history as item}
          <TransactionItem {item} />
        {:else}
          <div class="flex grow h-full w-full items-center justify-center">
            <Icon name="transactions-graphic" class="w-full max-w-sm px-10" />
          </div>
          <div class="opacity-70 pt-4 text-center">No transactions yet</div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
