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
  let message = '';
  let drawResults: any[] = [];
  let isLoading = false;
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

  // Fetch Loto data from API (not used in here but kept for learning purposes)
  async function fetchLotoData() {
    try {
      const response = await fetch('/api/loto');
      if (!response.ok) {
        throw new Error('Failed to fetch loto data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching loto data:', error);
      return [];
    }
  }

  // Reset all selections and results
  function resetSelection() {
    selectedNumbers = [];
    selectedLuckyNumber = null;
    totalSpent = 0;
    totalWon = 0;
    totalGamesWon = 0;
    netResult = 0;
    message = '';
    drawResults = [];
    sortColumn = 'Date';
    sortOrder = 'asc';
    gamesPlayedMessage = "";
    sortColumn = null;
    sortOrder = 'asc';
  }

  // Generate random numbers for selection
  function randomNumbers() {
    const randomNums = [];
    while (randomNums.length < 5) {
      const random = Math.floor(Math.random() * 49) + 1;
      if (!randomNums.includes(random)) {
        randomNums.push(random);
      }
    }
    selectedNumbers = randomNums;
    selectedLuckyNumber = Math.floor(Math.random() * 10) + 1;
  }

  // --- Bitmask Helper Functions ---
  // Convert an array of numbers to a BigInt bitmask
  function numbersToBitmask(numbers: number[]): bigint {
    let mask = 0n;
    for (const num of numbers) {
      // Set the (num-1)-th bit (numbers are 1-indexed)
      mask |= 1n << BigInt(num - 1);
    }
    return mask;
  }

  // Count the number of set bits (population count) in a BigInt
  function popcount(n: bigint): number {
    let count = 0;
    while (n) {
      count += Number(n & 1n);
      n >>= 1n;
    }
    return count;
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
    gamesPlayedMessage = `Il vous aurait fallu jouer ${gamesPlayed} grilles Loto différentes pour en obtenir une rentable.`;
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

  // Load CSV data on mount from the combined CSV file and precompute bitmasks for each draw
  onMount(async () => {
    try {
      const response = await fetch('/data/loto_combined.csv');
      const csvText = await response.text();
      const semicolonParser = dsvFormat(';');
      const parsedData = semicolonParser.parse(csvText);

      lotoData = parsedData
        .filter(draw => {
          const drawDate = parseDate(draw.date_de_tirage);
          return drawDate >= new Date('2017-03-06'); // Exclude draws before 2017-03-06
        })
        .map((draw) => {
          const [combinaison, chance] = draw.combinaison_gagnante_en_ordre_croissant.split('+');
          const drawNumbers = combinaison.split('-').map(Number);
          // Precompute the bitmask for the drawn numbers
          const bitmask = numbersToBitmask(drawNumbers);

          return {
            date: draw.date_de_tirage,
            draw: drawNumbers,
            bitmask,
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

  // Optimized calculateResults function using bitmask operations
  function calculateResultsOptimized() {
    gamesPlayedMessage = "";
    if (selectedNumbers.length !== 5 || selectedLuckyNumber === null) {
      message = 'Veuillez sélectionner 5 numéros et un numéro chance.';
      return;
    }
    calculatedNumbers = [...selectedNumbers];
    calculatedLuckyNumber = selectedLuckyNumber;

    isLoading = true;
    totalSpent = ticketPrice * lotoData.length;
    totalWon = 0;
    totalGamesWon = 0;
    netResult = 0;

    // Compute bitmask for user's selected numbers
    const userBitmask = numbersToBitmask(selectedNumbers);

    // Process each draw using bitmask AND and popcount for fast matching
    drawResults = lotoData.map((draw) => {
      const matchCount = popcount(userBitmask & draw.bitmask);
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
    message = `Vous avez dépensé ${totalSpent.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}€ pour jouer, vous avez gagné ${totalGamesWon} fois pour un total de ${totalWon.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}€, votre résultat net est de ${netResult.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}€`;

    isLoading = false;
    sortColumn = 'Date';
    sortOrder = 'desc';
    tick().then(() => {
      if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Standard calculateResults function calls the optimized version
  async function calculateResults() {
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

<div class="pt-5 max-w-5xl mx-auto space-y-4 px-4">
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
    <h2 class="text-xl font-semibold mb-2">Choisissez le numéro chance</h2>
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
    <p class="mb-2">Numéro chance sélectionné :</p>
    {#if selectedLuckyNumber}
      <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center border-orange-500">
        {selectedLuckyNumber}
      </span>
    {/if}
  </Card>

  <div class="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4" bind:this={resultsContainer}>
    <Button
      on:click={calculateResults}
      disabled={selectedNumbers.length !== 5 || selectedLuckyNumber === null || isLoading}
      class="px-4 py-2 min-h-[50px]"
    >
      {#if isLoading}
        Veuillez patienter
      {:else}
        Calculer les résultats
      {/if}
    </Button>
    <Button
      variant="outline"
      on:click={resetSelection}
      class="px-4 py-2 min-h-[50px]"
    >
      Réinitialiser
    </Button>
    <Button
      variant="outline"
      on:click={randomNumbers}
      class="px-4 py-2 min-h-[50px]"
    >
      Numéros aléatoires
    </Button>
    <Button
      variant="outline"
      on:click={randomNumbersUntilWin}
      class="px-4 py-2 min-h-[50px]"
    >
      Jouer jusqu'à gagner
    </Button>
  </div>

  {#if gamesPlayedMessage}
    <div class="mt-4">
      <div class="flex items-center justify-start p-4 bg-red-100 text-red-800 border-l-4 border-red-500 shadow-lg rounded-lg">
        <p class="font-bold text-lg">{gamesPlayedMessage}</p>
      </div>
    </div>
  {/if}

  {#if drawResults.length > 0}
    <!-- Animated net result display using NumberFlow -->
    <Card class="mt-4 p-6">
      <div class="flex items-center justify-center">
        <NumberFlow
          value={Math.abs(netResult)}
          prefix={netResult >= 0 ? '+' : '-'}
          format={{ style: 'currency', currency: 'EUR', trailingZeroDisplay: 'stripIfInteger' }}
          class="text-4xl font-bold"
          style="color: {netResult >= 0 ? '#34d399' : '#dc2626'};"
          transformTiming={{ duration: 1000, easing: 'ease-in-out' }}
          spinTiming={{ duration: 1000, easing: 'ease-in-out' }}
          opacityTiming={{ duration: 500, easing: 'ease-out' }}
        />
      </div>
    </Card>

    <div class="mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell class="font-bold cursor-pointer hover:underline px-4 py-2 text-left text-base" on:click={() => sortBy('Date')}>
              Date
              {#if sortColumn === 'Date'}
                <span class="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">
              Vos numéros
            </TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">
              Combinaison gagnante
            </TableCell>
            <TableCell class="font-bold cursor-pointer hover:underline px-4 py-2 text-left text-base min-w-[120px] whitespace-nowrap" on:click={() => sortBy('Gain')}>
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
              <TableCell>{result.date}</TableCell>
              <TableCell>
                <div class={`flex ${forceDesktopLayout ? 'flex-row space-x-1' : 'flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0'} items-center`}>
                  {#each calculatedNumbers as num}
                    <span class="inline-block p-2 border rounded min-w-[40px] text-center {result.matchingNumbers.includes(num) ? 'bg-green-400 text-white' : ''}">
                      {num}
                    </span>
                  {/each}
                  <span class="inline-block p-2 border rounded min-w-[40px] text-center border-orange-500 {result.matchingLuckyNumber ? 'bg-green-400 text-white' : ''}">
                    {calculatedLuckyNumber}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div class={`flex ${forceDesktopLayout ? 'flex-row space-x-1' : 'flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0'} items-center`}>
                  {#each result.draw as num}
                    <span class="inline-block p-2 border rounded min-w-[40px] text-center">
                      {num}
                    </span>
                  {/each}
                  <span class="inline-block p-2 border rounded min-w-[40px] text-center border-orange-500">
                    {result.chance}
                  </span>
                </div>
              </TableCell>
              <TableCell class="whitespace-nowrap">
                {result.gain > 0
                  ? `${result.gain.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`
                  : '0€'}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>
