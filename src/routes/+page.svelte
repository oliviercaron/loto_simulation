<script lang="ts">
    import { onMount } from 'svelte';
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
    // Variable pour stocker le message lié aux grilles jouées
    let gamesPlayedMessage = "";
  
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
    }

    function randomNumbers() {
      const randomNumbers = [];
      while (randomNumbers.length < 5) {
        const random = Math.floor(Math.random() * 49) + 1;
        if (!randomNumbers.includes(random)) {
          randomNumbers.push(random);
        }
      }
      selectedNumbers = randomNumbers;
      selectedLuckyNumber = Math.floor(Math.random() * 10) + 1;
    }

    function randomNumbersUntilWin() {
        let gamesPlayed = 0;

        // Réinitialiser les variables globales au début
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

        // Optionnel : Afficher le nombre de parties jouées
        // Créer le message avec le nombre de grilles jouées
        gamesPlayedMessage = `Il vous aurait fallu ${gamesPlayed} grilles pour en obtenir une rentable au Loto.`;
        console.log(`Nombre de parties jouées jusqu'à gagner : ${gamesPlayed}`);

  return gamesPlayed;
}
  
    let lotoData: any[] = [];
    let sortColumn = 'Date';
    let sortOrder: 'asc' | 'desc' = 'desc';
  
    onMount(async () => {
      try {
        const response = await fetch('/data/loto_201911.csv');
        const csvText = await response.text();
  
        // Parser les données avec le séparateur point-virgule
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
        console.error('Erreur lors du chargement des données :', error);
      }
    });
  
    function parseDate(dateString: string) {
      const [day, month, year] = dateString.split('/');
      return new Date(`${year}-${month}-${day}`);
    }
  
    function calculateResults() {
      if (selectedNumbers.length !== 5 || selectedLuckyNumber === null) {
        message = 'Veuillez sélectionner 5 numéros et un numéro chance.';
        return;
      }
  
      isLoading = true;
  
      totalSpent = ticketPrice * lotoData.length;
      totalWon = 0;
      totalGamesWon = 0;
      netResult = 0;
  
      drawResults = lotoData.map((draw) => {
        const matchingNumbers = selectedNumbers.filter((num) =>
          draw.draw.includes(num)
        );
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
    }
  
    function sortBy(column: string) {
      if (sortColumn === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortOrder = 'asc';
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
        } else {
          return 0;
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
  
  <!-- Style -->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
  
    body {
      font-family: 'Roboto', sans-serif;
    }
  
    .highlight {
      background-color: #34d399; /* Fond vert pour les numéros gagnants */
      color: white;
    }
  
    .lucky-number {
      border-color: #d97706; /* Bordure orange pour le numéro chance */
    }
  
    .container {
      padding-top: 20px; /* Padding entre le haut de la page et le cadre */
    }
  
    .sortable:hover {
      cursor: pointer;
      text-decoration: underline;
    }
  
    .sort-arrow {
      margin-left: 5px;
    }
  </style>
  
  <!-- Affichage HTML -->
  <div class="container max-w-5xl mx-auto space-y-4">
    <Card class="p-6">
      <h1 class="text-2xl font-bold">Avez-vous gagné au loto&nbsp;?</h1>
      <p class="text-gray-600">
        Imaginez que vous jouez les mêmes numéros depuis le 2 novembre 2019...
      </p>
    </Card>
  
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-2">Choisissez les 5 numéros</h2>
      <div class="grid grid-cols-10 gap-2 mb-4">
        {#each numbers as number}
          <Button
            variant={selectedNumbers.includes(number) ? 'default' : 'outline'}
            on:click={() => toggleNumber(number)}
            disabled={
              !selectedNumbers.includes(number) && selectedNumbers.length >= 5
            }
            class="w-full"
          >
            {number}
          </Button>
        {/each}
      </div>
      <p class="mb-2">Numéros sélectionnés :</p>
      <div class="flex flex-wrap mb-4">
        {#each selectedNumbers as num}
          <span class="inline-block p-2 m-1 border rounded">
            {num}
          </span>
        {/each}
      </div>
    </Card>
  
    <Card class="p-6">
      <h2 class="text-xl font-semibold mb-2">Choisissez le numéro chance</h2>
      <div class="grid grid-cols-10 gap-2 mb-4">
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
        <span class="inline-block p-2 m-1 border rounded lucky-number">
          {selectedLuckyNumber}
        </span>
      {/if}
    </Card>
  
    <div class="flex justify-center space-x-4">
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

    <!-- Affichage du message avec une alerte stylée -->
    {#if gamesPlayedMessage}
    <div class="mt-4">
        <!-- Composant Alert stylisé pour attirer l'attention -->
        <div class="flex items-center justify-start p-4 bg-red-100 text-red-800 border-l-4 border-red-500 shadow-lg rounded-lg">
        <!-- Icône d'avertissement -->
        <svg class="w-6 h-6 mr-3 text-red-600 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 15h0m6.938-2.496l-1.414-1.414M16.242 7.758l-1.415 1.415m-6.364 6.364L6.05 15.828M9.758 9.757l-1.414 1.415M12 12m7.938-2.496l-1.414-1.414M16.242 3.758l-1.415 1.415m-6.364 6.364L6.05 7.828M9.758 3.757l-1.414 1.415" />
        </svg>
        <!-- Message d'alerte -->
        <p class="font-bold text-lg">{gamesPlayedMessage}</p>
        </div>
    </div>
    <div class="flex items-center justify-start p-4 bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg rounded-lg">
        <svg class="w-6 h-6 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 15h0m6.938-2.496l-1.414-1.414M16.242 7.758l-1.415 1.415m-6.364 6.364L6.05 15.828M9.758 9.757l-1.414 1.415M12 12m7.938-2.496l-1.414-1.414M16.242 3.758l-1.415 1.415m-6.364 6.364L6.05 7.828M9.758 3.757l-1.414 1.415" />
        </svg>
        <p class="font-bold text-lg">{gamesPlayedMessage}</p>
    </div>
    <div class="flex items-center justify-start p-4 border-2 border-red-500 rounded-lg">
        <p class="font-bold text-lg text-red-600 animate-ping">{gamesPlayedMessage}</p>
    </div>
    <div class="flex items-center justify-start p-4 bg-red-50 text-red-900 border-t-4 border-red-600 shadow-lg rounded-md">
        <svg class="w-8 h-8 mr-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 15h0m6.938-2.496l-1.414-1.414M16.242 7.758l-1.415 1.415m-6.364 6.364L6.05 15.828M9.758 9.757l-1.414 1.415M12 12m7.938-2.496l-1.414-1.414M16.242 3.758l-1.415 1.415m-6.364 6.364L6.05 7.828M9.758 3.757l-1.414 1.415" />
        </svg>
        <p class="font-semibold text-xl">{gamesPlayedMessage}</p>
     </div>
     <div class="flex items-center justify-start p-4 bg-gray-800 text-white shadow-lg rounded-md">
        <p class="font-extrabold text-xl text-yellow-400 animate-pulse">{gamesPlayedMessage}</p>
    </div>
    <div class="flex items-center justify-start p-4 bg-white border border-gray-300 shadow-md rounded-md">
        <span class="inline-block bg-red-600 text-white text-sm font-bold mr-3 px-3 py-1 rounded-full">Alerte</span>
        <p class="font-semibold text-red-700">{gamesPlayedMessage}</p>
    </div>
    <div class="flex items-center p-4 border-l-4 border-red-600 bg-gray-50 text-gray-800 shadow-md rounded-md">
        <p class="font-semibold text-base">{gamesPlayedMessage}</p>
      </div>
      <div class="flex justify-between items-center p-4 bg-gradient-to-r from-gray-200 to-gray-100 border border-gray-300 shadow-lg rounded-lg">
        <p class="font-semibold text-gray-900">{gamesPlayedMessage}</p>
        <svg class="w-6 h-6 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1v-1h2v5zM12 8h.01"/>
        </svg>
      </div>
      <div class="flex items-center justify-between p-4 bg-white border border-gray-400 shadow-sm rounded-md">
        <p class="font-bold text-lg text-gray-800">{gamesPlayedMessage}</p>
      </div>
      <div class="flex items-center p-4 bg-gradient-to-r from-red-50 to-red-100 text-gray-800 border border-red-400 rounded-lg shadow-md">
        <span class="inline-block bg-red-500 text-white font-bold mr-4 px-3 py-1 rounded-full">1</span>
        <p class="font-semibold text-gray-900">{gamesPlayedMessage}</p>
      </div>
      <div class="relative flex items-center p-6 bg-gray-50 border border-gray-300 shadow-lg rounded-lg">
        <svg class="absolute inset-0 w-12 h-12 text-gray-300 opacity-20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 15h0m6.938-2.496l-1.414-1.414M16.242 7.758l-1.415 1.415m-6.364 6.364L6.05 15.828M9.758 9.757l-1.414 1.415M12 12m7.938-2.496l-1.414-1.414M16.242 3.758l-1.415 1.415m-6.364 6.364L6.05 7.828M9.758 3.757l-1.414 1.415" />
        </svg>
        <p class="font-semibold text-lg text-gray-900 relative">{gamesPlayedMessage}</p>
      </div>
      
    
    {/if}
  
    {#if message}
      <div
        class="p-4 mt-4 text-white font-bold"
        class:bg-green-500={netResult >= 0}
        class:bg-red-500={netResult < 0}
      >
        <p>{message}</p>
      </div>
    {/if}
  
    {#if drawResults.length > 0}
    <div class="mt-4 overflow-x-auto">
        <Table>
            <TableHeader>
              <TableRow>
                <th
                  class="font-bold sortable px-4 py-2 text-left"
                  on:click={() => sortBy('Date')}
                >
                  Date
                  {#if sortColumn === 'Date'}
                    <span class="sort-arrow">
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                  {/if}
                </th>
                <th class="font-bold px-4 py-2 text-left">Vos numéros</th>
                <th class="font-bold px-4 py-2 text-left">Combinaison gagnante</th>
                <th
                  class="font-bold sortable px-4 py-2 text-left"
                  on:click={() => sortBy('Gain')}
                >
                  Gain
                  {#if sortColumn === 'Gain'}
                    <span class="sort-arrow">
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                  {/if}
                </th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each drawResults as result}
                <TableRow>
                  <TableCell>{result.date}</TableCell>
                  <TableCell>
                    <!-- Affichage de vos numéros avec mise en évidence des correspondances -->
                    {#each selectedNumbers as num}
                      <span
                        class="inline-block p-2 m-1 border rounded {result.matchingNumbers.includes(num) ? 'highlight' : ''}"
                      >
                        {num}
                      </span>
                    {/each}
                    <span
                      class="inline-block p-2 m-1 border rounded lucky-number {result.matchingLuckyNumber ? 'highlight' : ''}"
                    >
                      {selectedLuckyNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <!-- Affichage des numéros gagnants du tirage -->
                    {#each result.draw as num}
                      <span class="inline-block p-2 m-1 border rounded">
                        {num}
                      </span>
                    {/each}
                    <span class="inline-block p-2 m-1 border rounded lucky-number">
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
  