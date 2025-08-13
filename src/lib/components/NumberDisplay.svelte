<script lang="ts">
  export let numbers: number[];
  export let luckyNumber: number;
  export let matchingNumbers: number[] = [];
  export let matchingLuckyNumber: boolean = false;
  export let forceDesktopLayout: boolean = false;
</script>

<div class={`flex ${forceDesktopLayout ? 'flex-row space-x-1' : 'flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0'} items-center`}>
  {#each numbers as num}
    <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center {matchingNumbers.includes(num) ? 'bg-green-400 text-white' : ''}">
      {num}
    </span>
  {/each}
  <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center border-orange-500 {matchingLuckyNumber ? 'bg-green-400 text-white' : ''}">
    {luckyNumber}
  </span>
</div>