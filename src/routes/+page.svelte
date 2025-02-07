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

  // Import the animated number component from @number-flow/svelte
  import NumberFlow from '@number-flow/svelte';

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
  let gamesPlayedMessage = ""; // Message for played grids
  let resultsContainer: HTMLElement; // Reference to the results container for scrolling

  let calculatedNumbers: number[] = [];
  let calculatedLuckyNumber: number | null = null;

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const luckyNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

  function toggleNumber(number: number) {
    if (selectedNumbers.includes(number)) {
      selectedNumbers = selectedNumbers.filter((n) => n !== number);
    } else {
      if (selectedNumbers.length < 5) {
        selectedNumbers = [...selectedNumbers, number];
      }
    }
  }

  function selectLuckyNumber(number: number) {
    selectedLuckyNumber = number;
  }

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

  function randomNumbersUntilWin() {
    let gamesPlayed = 0;
    totalSpent = 0;
    totalWon = 0;
    netResult = 0;
    totalGamesWon = 0;
    drawResults = [];

    while (netResult <= 0) {
      randomNumbers();
      calculateResults();
      gamesPlayed++;
    }
    gamesPlayedMessage = `Il vous aurait fallu jouer ${gamesPlayed} grilles Loto différentes pour en obtenir une rentable.`;
    return gamesPlayed;
  }

  let lotoData: any[] = [];
  let sortColumn = 'Date';
  let sortOrder: 'asc' | 'desc' = 'desc';

  onMount(async () => {
    try {
      const response = await fetch('/data/loto_201911.csv');
      const csvText = await response.text();
      const semicolonParser = dsvFormat(';');
      const parsedData = semicolonParser.parse(csvText);

      lotoData = parsedData.map((draw) => {
        const [combinaison, chance] = draw.combinaison_gagnante_en_ordre_croissant.split('+');
        const drawNumbers = combinaison.split('-').map(Number);
        return {
          date: draw.date_de_tirage,
          draw: drawNumbers,
          chance: +chance,
          gains: {
            rang1: parseFloat((draw.rapport_du_rang1 || '0').replace(',', '.')) || 0,
            rang2: parseFloat((draw.rapport_du_rang2 || '0').replace(',', '.')) || 0,
            rang3: parseFloat((draw.rapport_du_rang3 || '0').replace(',', '.')) || 0,
            rang4: parseFloat((draw.rapport_du_rang4 || '0').replace(',', '.')) || 0,
            rang5: parseFloat((draw.rapport_du_rang5 || '0').replace(',', '.')) || 0,
            rang6: parseFloat((draw.rapport_du_rang6 || '0').replace(',', '.')) || 0,
            rang7: parseFloat((draw.rapport_du_rang7 || '0').replace(',', '.')) || 0,
            rang8: parseFloat((draw.rapport_du_rang8 || '0').replace(',', '.')) || 0,
            rang9: parseFloat((draw.rapport_du_rang9 || '0').replace(',', '.')) || 0,
          },
        };
      });
    } catch (error) {
      console.error('Error loading loto data:', error);
    }
  });

  function parseDate(dateString: string) {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  async function calculateResults() {
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

    drawResults = lotoData.map((draw) => {
      const matchingNumbers = selectedNumbers.filter((num) => draw.draw.includes(num));
      const matchingLuckyNumber = selectedLuckyNumber === draw.chance;
      let gain = 0;
      const matchCount = matchingNumbers.length;

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
        matchingNumbers,
        matchingLuckyNumber,
        gain,
      };
    });

    netResult = totalWon - totalSpent;
    message = `Vous avez dépensé ${totalSpent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ pour jouer, vous avez gagné ${totalGamesWon} fois pour un total de ${totalWon.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€, votre résultat net est de ${netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;

    isLoading = false;
    sortColumn = 'Date';
    sortOrder = 'desc';
    await tick();
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function sortBy(column: string) {
    if (sortColumn === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortOrder = column === 'Gain' ? 'desc' : 'asc';
    }
    sortDrawResults();
  }

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

<div class="pt-5 max-w-5xl mx-auto space-y-4">
  <Card class="p-6">
    <h1 class="text-2xl font-bold">Simulez vos gains au Loto</h1>
    <p class="text-gray-600">
      Imaginez que vous jouez les mêmes numéros depuis novembre 2019...
    </p>
  </Card>

  <Card class="p-6">
    <h2 class="text-xl font-semibold mb-2">Choisissez les 5 numéros</h2>
    <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-4">
      {#each numbers as number}
        <Button
          variant={selectedNumbers.includes(number) ? 'default' : 'outline'}
          on:click={() => toggleNumber(number)}
          disabled={!selectedNumbers.includes(number) && selectedNumbers.length >= 5}
          class="w-full"
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
    <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-4">
      {#each luckyNumbers as number}
        <Button
          variant={selectedLuckyNumber === number ? 'default' : 'outline'}
          on:click={() => selectLuckyNumber(number)}
          class="w-full"
        >
          {number}
        </Button>
      {/each}
    </div>
    <p class="mb-2">Numéro chance sélectionné :</p>
    {#if selectedLuckyNumber}
      <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center border-[#d97706]">
        {selectedLuckyNumber}
      </span>
    {/if}
  </Card>

  <div class="flex justify-center space-x-4" bind:this={resultsContainer}>
    <Button
      on:click={calculateResults}
      disabled={selectedNumbers.length !== 5 || selectedLuckyNumber === null || isLoading}
      class="px-4 py-2"
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
      class="px-4 py-2"
    >
      Réinitialiser
    </Button>
    <Button
      variant="outline"
      on:click={randomNumbers}
      class="px-4 py-2"
    >
      Numéros aléatoires
    </Button>
    <Button
      variant="outline"
      on:click={randomNumbersUntilWin}
      class="px-4 py-2"
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
                <span class="ml-[5px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">Vos numéros</TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">Combinaison gagnante</TableCell>
            <TableCell class="font-bold cursor-pointer hover:underline px-4 py-2 text-left text-base" on:click={() => sortBy('Gain')}>
              Gain
              {#if sortColumn === 'Gain'}
                <span class="ml-[5px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each drawResults as result}
            <TableRow>
              <TableCell>{result.date}</TableCell>
              <TableCell>
                {#each calculatedNumbers as num}
                  <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center {result.matchingNumbers.includes(num) ? 'bg-[#34d399] text-white' : ''}">
                    {num}
                  </span>
                {/each}
                <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center border-[#d97706] {result.matchingLuckyNumber ? 'bg-[#34d399] text-white' : ''}">
                  {calculatedLuckyNumber}
                </span>
              </TableCell>
              <TableCell>
                {#each result.draw as num}
                  <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center">
                    {num}
                  </span>
                {/each}
                <span class="inline-block p-2 m-1 border rounded min-w-[40px] text-center border-[#d97706]">
                  {result.chance}
                </span>
              </TableCell>
              <TableCell>
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
