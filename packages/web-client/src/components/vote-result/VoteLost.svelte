<script lang="ts">
import Avatar from '$components/avatar/Avatar.svelte'
import Button from '$components/button/Button.svelte'
import { fade } from 'svelte/transition'
</script>

<vote-lost
  transition:fade|local
  class="absolute z-[100] flex h-full w-full flex-col items-center justify-center space-y-10 bg-black px-8 text-white">
  <Avatar
    class="h-24 w-24"
    src="https://beebom.com/wp-content/uploads/2022/02/Featured.jpg?w=730&h=487&crop=1&quality=75" />
  <div class="text-3xl font-bold">Uh-Oh! You lost</div>
  <div class="text-center text-white/80">
    You lost 50 tokens on the vote you placed on video “Dance with me”
  </div>
  <div class="flex flex-col items-center">
    <div class="text-white/80">Your rank</div>
    <div class="text-3xl">220</div>
  </div>
  <div class="flex w-full flex-col items-center space-y-2">
    <Button class="w-full">Place a new vote</Button>
    <Button type="secondary" class="w-full">Check balance</Button>
  </div>
</vote-lost>
