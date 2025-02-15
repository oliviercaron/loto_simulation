<svelte:head>
  <!-- Ensure proper scaling on mobile devices -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<script lang="ts">
  // Import necessary modules and components
  import { onMount, tick } from 'svelte';
  import { dsvFormat } from 'd3-dsv';
  import { Button } from '$lib/components/ui/button';
  import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import Card from '$lib/components/ui/card/card.svelte';
  import NumberFlow from '@number-flow/svelte';

  // Layout and selection variables
  let forceDesktopLayout = false;
  let selectedNumbers: number[] = [];
  let selectedLuckyNumber: number | null = null;
  let totalSpent = 0;
  let totalWon = 0;
  let totalGamesWon = 0;
  let netResult = 0;
  let drawResults: any[] = [];
  const ticketPrice = 2.2;
  let gamesPlayedMessage = "";
  let resultsContainer: HTMLElement;

  let calculatedNumbers: number[] = [];
  let calculatedLuckyNumber: number | null = null;

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const luckyNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

  // Toggle a number in the selection
  function toggleNumber(number: number) {
    if (selectedNumbers.includes(number)) {
      selectedNumbers = selectedNumbers.filter((n) => n !== number);
    } else {
      if (selectedNumbers.length < 5) {
        selectedNumbers = [...selectedNumbers, number];
      }
    }
  }

  // Select the lucky number
  function selectLuckyNumber(number: number) {
    selectedLuckyNumber = number;
  }

  // Reset all selections and results
  function resetSelection() {
    selectedNumbers = [];
    selectedLuckyNumber = null;
    totalSpent = 0;
    totalWon = 0;
    totalGamesWon = 0;
    netResult = 0;
    drawResults = [];
    gamesPlayedMessage = "";
    sortColumn = 'Date';
    sortOrder = 'desc';
  }

  // Generate random numbers for selection
  function randomNumbers() {
    const randomNums: number[] = [];
    while (randomNums.length < 5) {
      const random = Math.floor(Math.random() * 49) + 1;
      if (!randomNums.includes(random)) {
        randomNums.push(random);
      }
    }
    selectedNumbers = randomNums;
    selectedLuckyNumber = Math.floor(Math.random() * 10) + 1;
  }

  // --- Bitmask Helper Functions using two 32-bit integers and lookup ---

  // Precompute a lookup table for popcount of 8-bit numbers
  const popcountLookup = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let count = 0;
    let v = i;
    while (v) {
      count += v & 1;
      v >>= 1;
    }
    popcountLookup[i] = count;
  }

  // Count the number of set bits in a 32-bit integer using the lookup table
  function popcount32(x: number): number {
    return popcountLookup[x & 0xff] +
           popcountLookup[(x >>> 8) & 0xff] +
           popcountLookup[(x >>> 16) & 0xff] +
           popcountLookup[(x >>> 24) & 0xff];
  }

  // Convert an array of numbers to a bitmask represented by two 32-bit integers (low and high parts)
  function numbersToBitmask32(numbers: number[]): { low: number, high: number } {
    let low = 0;
    let high = 0;
    for (const num of numbers) {
      const index = num - 1;
      if (index < 32) {
        low |= 1 << index;
      } else {
        high |= 1 << (index - 32);
      }
    }
    return { low, high };
  }

  // Simulate playing until a positive net result is obtained.
  // For performance reasons, we use the optimized calculation.
  function randomNumbersUntilWin() {
    let gamesPlayed = 0;
    totalSpent = 0;
    totalWon = 0;
    netResult = 0;
    totalGamesWon = 0;
    drawResults = [];

    // Loop until netResult becomes positive
    while (netResult <= 0) {
      randomNumbers();
      calculateResultsOptimized();
      gamesPlayed++;
    }
    gamesPlayedMessage = `Il vous aurait fallu jouer ${gamesPlayed} grilles Loto différentes pour en obtenir <u>finalement</u> une rentable.`;
    return gamesPlayed;
  }

  let lotoData: any[] = [];
  let sortColumn = 'Date';
  let sortOrder: 'asc' | 'desc' = 'desc';

  // Helper function to safely parse gain values
  function parseGain(value: string): number {
    if (!value || value.trim() === '' || value.trim().toUpperCase() === 'NA') {
      return 0;
    }
    const replaced = value.replace(',', '.');
    const parsed = parseFloat(replaced);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Load CSV data on mount from the combined CSV file and precompute 32-bit bitmasks for each draw
  onMount(async () => {
    try {
      const response = await fetch('/data/loto_combined.csv');
      const csvText = await response.text();
      const semicolonParser = dsvFormat(';');
      const parsedData = semicolonParser.parse(csvText);

      lotoData = parsedData
        .filter((draw: { date_de_tirage: string; }) => {
          const drawDate = parseDate(draw.date_de_tirage);
          return drawDate >= new Date('2017-03-06'); // Exclude draws before 2017-03-06
        })
        .map((draw: { combinaison_gagnante_en_ordre_croissant: { split: (arg0: string) => [any, any]; }; date_de_tirage: Date; rapport_du_rang1: string; rapport_du_rang2: string; rapport_du_rang3: string; rapport_du_rang4: string; rapport_du_rang5: string; rapport_du_rang6: string; rapport_du_rang7: string; rapport_du_rang8: string; rapport_du_rang9: string; }) => {
          const [combinaison, chance] = draw.combinaison_gagnante_en_ordre_croissant.split('+');
          const drawNumbers = combinaison.split('-').map(Number);
          // Precompute the 32-bit bitmask for the drawn numbers
          const mask32 = numbersToBitmask32(drawNumbers);

          return {
            date: draw.date_de_tirage,
            draw: drawNumbers,
            maskLow: mask32.low,
            maskHigh: mask32.high,
            chance: +chance,
            gains: {
              rang1: parseGain(draw.rapport_du_rang1),
              rang2: parseGain(draw.rapport_du_rang2),
              rang3: parseGain(draw.rapport_du_rang3),
              rang4: parseGain(draw.rapport_du_rang4),
              rang5: parseGain(draw.rapport_du_rang5),
              rang6: parseGain(draw.rapport_du_rang6),
              rang7: parseGain(draw.rapport_du_rang7),
              rang8: parseGain(draw.rapport_du_rang8),
              rang9: parseGain(draw.rapport_du_rang9),
            },
          };
        });
    } catch (error) {
      console.error('Error loading loto data:', error);
    }
  });

  // Parse date string in format DD/MM/YYYY
  function parseDate(dateString: string) {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  // Optimized calculateResults function using 32-bit bitmask operations and lookup table
  function calculateResultsOptimized() {
    gamesPlayedMessage = "";
    if (selectedNumbers.length !== 5 || selectedLuckyNumber === null) {
      return;
    }
    calculatedNumbers = [...selectedNumbers];
    calculatedLuckyNumber = selectedLuckyNumber;

    totalSpent = ticketPrice * lotoData.length;
    totalWon = 0;
    totalGamesWon = 0;
    netResult = 0;

    // Compute bitmask for user's selected numbers using 32-bit representation
    const userMask = numbersToBitmask32(selectedNumbers);

    // Process each draw using bitmask operations and the lookup table for popcount
    drawResults = lotoData.map((draw) => {
      const matchCount = popcount32(userMask.low & draw.maskLow) +
                         popcount32(userMask.high & draw.maskHigh);
      const matchingLuckyNumber = (selectedLuckyNumber === draw.chance);
      let gain = 0;

      // Determine gain based on matching numbers and lucky number
      if (matchCount === 5 && matchingLuckyNumber) {
        gain = draw.gains.rang1;
      } else if (matchCount === 5) {
        gain = draw.gains.rang2;
      } else if (matchCount === 4 && matchingLuckyNumber) {
        gain = draw.gains.rang3;
      } else if (matchCount === 4) {
        gain = draw.gains.rang4;
      } else if (matchCount === 3 && matchingLuckyNumber) {
        gain = draw.gains.rang5;
      } else if (matchCount === 3) {
        gain = draw.gains.rang6;
      } else if (matchCount === 2 && matchingLuckyNumber) {
        gain = draw.gains.rang7;
      } else if (matchCount === 2) {
        gain = draw.gains.rang8;
      } else if (matchCount === 1 && matchingLuckyNumber) {
        gain = draw.gains.rang9;
      }

      if (gain > 0) {
        totalWon += gain;
        totalGamesWon++;
      }
      return {
        ...draw,
        // For display, we keep the list of matching numbers (computed via array filtering)
        matchingNumbers: selectedNumbers.filter(num => draw.draw.includes(num)),
        matchingLuckyNumber,
        gain,
      };
    });

    netResult = totalWon - totalSpent;
    tick().then(() => {
      if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
    sortColumn = 'Date';
    sortOrder = 'desc';
  }

  // Standard calculateResults function calls the optimized version
  function calculateResults() {
    calculateResultsOptimized();
  }

  // --- Sorting Functions ---
  // Sort results by given column
  function sortBy(column: string) {
    if (sortColumn === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortOrder = column === 'Gain' ? 'desc' : 'asc';
    }
    sortDrawResults();
  }

  // Sort the draw results based on sortColumn and sortOrder
  function sortDrawResults() {
    drawResults = [...drawResults].sort((a, b) => {
      let valueA, valueB;
      if (sortColumn === 'Date') {
        valueA = parseDate(a.date);
        valueB = parseDate(b.date);
      } else if (sortColumn === 'Gain') {
        valueA = a.gain;
        valueB = b.gain;
        if (valueA === valueB) {
          const matchCountA = a.matchingNumbers.length;
          const matchCountB = b.matchingNumbers.length;
          if (matchCountA === matchCountB) {
            const luckyA = a.matchingLuckyNumber ? 1 : 0;
            const luckyB = b.matchingLuckyNumber ? 1 : 0;
            return sortOrder === 'asc' ? luckyA - luckyB : luckyB - luckyA;
          }
          return sortOrder === 'asc' ? matchCountA - matchCountB : matchCountB - matchCountA;
        }
      }
      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }
</script>

<div class="pt-5 pb-8 max-w-5xl mx-auto space-y-4 px-4">
  <Card class="p-6">
    <h1 class="text-2xl font-bold">Simulez vos gains au Loto</h1>
    <p class="text-gray-600">
      Imaginez que vous jouez les mêmes numéros depuis mars 2017...
    </p>
  </Card>

  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-2">Choisissez les 5 numéros</h2>
    <!-- Responsive grid for number selection -->
    <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2 mb-4">
      {#each numbers as number}
        <Button
          variant={selectedNumbers.includes(number) ? 'default' : 'outline'}
          on:click={() => toggleNumber(number)}
          disabled={!selectedNumbers.includes(number) && selectedNumbers.length >= 5}
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
  </Card>

  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-2">Choisissez le numéro Chance</h2>
    <!-- Responsive grid for lucky numbers -->
    <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2 mb-4">
      {#each luckyNumbers as number}
        <Button
          variant={selectedLuckyNumber === number ? 'default' : 'outline'}
          on:click={() => selectLuckyNumber(number)}
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
  </Card>

  <div class="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4" bind:this={resultsContainer}>
    <Button
      on:click={calculateResults}
      disabled={selectedNumbers.length !== 5 || selectedLuckyNumber === null}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Calculer les résultats
    </Button>
    <Button
      variant="outline"
      on:click={resetSelection}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Réinitialiser
    </Button>
    <Button
      variant="outline"
      on:click={randomNumbers}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Numéros aléatoires
    </Button>
    <Button
      on:click={randomNumbersUntilWin}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Jouer jusqu'à gagner
    </Button>
  </div>

  <!-- Card with game statistics -->
  <Card class="mt-4 p-6 shadow-lg">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Total spent amount -->
      <div class="flex flex-col items-center">
        <p class="text-gray-600 text-sm">Montant total dépensé</p>
        <NumberFlow
          value={totalSpent}
          format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
          class="text-2xl sm:text-3xl text-red-500"
          transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
          spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
          opacityTiming={{ duration: 500, easing: 'ease-out' }}
        />
      </div>

      <!-- Total won amount -->
      <div class="flex flex-col items-center">
        <p class="text-gray-600 text-sm">Montant total gagné</p>
        <NumberFlow
          value={totalWon}
          format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
          class="text-2xl sm:text-3xl text-green-500"
          transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
          spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
          opacityTiming={{ duration: 500, easing: 'ease-out' }}
        />
      </div>

      <!-- Net result with NumberFlow animation -->
      <div class="flex flex-col items-center">
        <p class="text-gray-600 text-sm">Résultat net</p>
        <NumberFlow
          value={Math.abs(netResult)}
          prefix={netResult >= 0 ? '+' : '-'}
          format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
          class="text-2xl sm:text-3xl font-bold"
          style="color: {netResult >= 0 ? '#10B981' : '#DC2626'};"
          transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
          spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
          opacityTiming={{ duration: 500, easing: 'ease-out' }}
        />
      </div>
    </div>
  </Card>

  {#if drawResults.length > 0}
    {#if gamesPlayedMessage}
      <div class="mt-4">
        <!-- Main message -->
        <div class="flex items-center justify-center p-4 bg-red-100 text-red-800 border-l-4 border-red-500 shadow-lg rounded-lg">
          <p class="font-bold text-lg text-center">{@html gamesPlayedMessage}</p>
        </div>
      </div>
    {/if}
    <div class="mt-4 mx-2 sm:mx-4">
      <div class="overflow-x-auto">
        <Table class="table-auto w-full">
          <TableHeader>
            <TableRow>
              <TableCell
                class="cursor-pointer hover:underline px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold text-left"
                on:click={() => sortBy('Date')}
              >
                Date
                {#if sortColumn === 'Date'}
                  <span class="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                {/if}
              </TableCell>
              <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold text-left">
                Vos numéros
              </TableCell>
              <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold text-left">
                Combinaison gagnante
              </TableCell>
              <TableCell
                class="cursor-pointer hover:underline px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base font-bold text-left whitespace-nowrap"
                on:click={() => sortBy('Gain')}
              >
                Gain
                {#if sortColumn === 'Gain'}
                  <span class="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                {/if}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each drawResults as result}
              <TableRow>
                <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
                  {result.date}
                </TableCell>
                <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
                  <div class={`flex ${forceDesktopLayout ? 'flex-row space-x-1' : 'flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0'} items-center`}>
                    {#each calculatedNumbers as num}
                      <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center {result.matchingNumbers.includes(num) ? 'bg-green-400 text-white' : ''}">
                        {num}
                      </span>
                    {/each}
                    <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center border-orange-500 {result.matchingLuckyNumber ? 'bg-green-400 text-white' : ''}">
                      {calculatedLuckyNumber}
                    </span>
                  </div>
                </TableCell>
                <TableCell class="px-1 sm:px-2 py-1 sm:py-2 text-xs sm:text-sm md:text-base">
                  <div class={`flex ${forceDesktopLayout ? 'flex-row space-x-1' : 'flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0'} items-center`}>
                    {#each result.draw as num}
                      <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center">
                        {num}
                      </span>
                    {/each}
                    <span class="inline-block p-1 sm:p-2 border rounded min-w-[32px] sm:min-w-[40px] text-center border-orange-500">
                      {result.chance}
                    </span>
                  </div>
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
  {/if}
</div>