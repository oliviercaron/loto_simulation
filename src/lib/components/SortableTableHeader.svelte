<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { TableHead } from '$lib/components/ui/table';
  
  export let column: string;
  export let title: string;
  export let sortColumn: string;
  export let sortOrder: 'asc' | 'desc';
  export let sortable: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  function handleSort() {
    if (sortable) {
      dispatch('sort', column);
    }
  }
</script>

<TableHead
  aria-sort={sortable && sortColumn === column ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
>
  {#if sortable}
    <button
      type="button"
      on:click={handleSort}
      class="w-full text-left cursor-pointer hover:underline px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold appearance-none bg-transparent border-0 focus:outline-none"
    >
      {title}
      {#if sortColumn === column}
        <span class="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
      {/if}
    </button>
  {:else}
    <div class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold text-left">
      {title}
    </div>
  {/if}
</TableHead>