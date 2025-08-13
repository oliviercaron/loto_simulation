<!-- LuckyNumberSelector.svelte mis à jour -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  
  export let luckyNumbers: number[];
  export let selectedLuckyNumber: number | null;
  export let onSelect: (number: number) => void;
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">Choisissez le numéro Chance</h2>
  <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2 mb-4">
    {#each luckyNumbers as number}
      <Button
        variant={selectedLuckyNumber === number ? 'default' : 'outline'}
        on:click={() => onSelect(number)}
        class="w-full min-h-[50px] px-4 py-2"
      >
        {number}
      </Button>
    {/each}
  </div>
  
  <p class="mb-2">Numéro Chance sélectionné :</p>
  {#if selectedLuckyNumber}
    <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center border-orange-500">
      {selectedLuckyNumber}
    </span>
  {/if}
</div>