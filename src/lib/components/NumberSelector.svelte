<!-- NumberSelector.svelte mis à jour -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  
  export let numbers: number[];
  export let selectedNumbers: number[];
  export let maxSelection: number;
  export let title: string;
  export let onToggle: (number: number) => void;
  export let gridCols: string = "grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10";
</script>

<div>
  <h2 class="text-xl font-semibold mb-2">{title}</h2>
  <div class="grid {gridCols} gap-2 mb-4">
    {#each numbers as number}
      <Button
        variant={selectedNumbers.includes(number) ? 'default' : 'outline'}
        on:click={() => onToggle(number)}
        disabled={!selectedNumbers.includes(number) && selectedNumbers.length >= maxSelection}
        class="w-full min-h-[50px] px-4 py-2"
      >
        {number}
      </Button>
    {/each}
  </div>
  
  <p class="mb-2">Numéros sélectionnés :</p>
  <div class="flex flex-wrap mb-4">
    {#each selectedNumbers as num}
      <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center">
        {num}
      </span>
    {/each}
  </div>
</div>