<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableHeader,
  } from '$lib/components/ui/table';
  import SortableTableHeader from '$lib/components/SortableTableHeader.svelte';
  import NumberDisplay from '$lib/components/NumberDisplay.svelte';
  
  export let drawResults: any[];
  export let calculatedNumbers: number[];
  export let calculatedLuckyNumber: number | null;
  export let forceDesktopLayout: boolean = false;
  export let sortColumn: string;
  export let sortOrder: 'asc' | 'desc';
  
  const dispatch = createEventDispatcher();
  
  function handleSort(event: CustomEvent) {
    dispatch('sort', event.detail);
  }
</script>

<div class="mt-4 mx-2 sm:mx-4">
  <div class="overflow-x-auto">
    <Table class="table-auto w-full">
      <TableHeader>
        <TableRow>
          <SortableTableHeader
            column="Date"
            title="Date"
            {sortColumn}
            {sortOrder}
            on:sort={handleSort}
          />
          <SortableTableHeader
            column="Numbers"
            title="Vos numéros"
            {sortColumn}
            {sortOrder}
            sortable={false}
          />
          <SortableTableHeader
            column="WinningCombo"
            title="Combinaison gagnante"
            {sortColumn}
            {sortOrder}
            sortable={false}
          />
          <SortableTableHeader
            column="Gain"
            title="Gain"
            {sortColumn}
            {sortOrder}
            on:sort={handleSort}
          />
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {#each drawResults as result}
          <TableRow>
            <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
              {result.date}
            </TableCell>
            
            <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
              <NumberDisplay
                numbers={calculatedNumbers}
                luckyNumber={calculatedLuckyNumber}
                matchingNumbers={result.matchingNumbers}
                matchingLuckyNumber={result.matchingLuckyNumber}
                {forceDesktopLayout}
              />
            </TableCell>
            
            <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
              <NumberDisplay
                numbers={result.draw}
                luckyNumber={result.chance}
                {forceDesktopLayout}
              />
            </TableCell>
            
            <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base whitespace-nowrap">
              {result.gain > 0
                ? `${result.gain.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`
                : '0€'}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</div>