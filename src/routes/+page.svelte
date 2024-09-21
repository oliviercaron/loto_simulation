<script lang="ts">
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
  let gamesPlayedMessage = ""; // Message pour les grilles jouées
  let resultsContainer: HTMLElement; // Référence au conteneur de résultats pour scroller après le calcul

  
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
    const response = await fetch('/api/loto'); // Appel à l'API
    if (!response.ok) {
      throw new Error('Failed to fetch loto data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors du chargement des données :', error);
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

    // Réinitialisation du tri
    sortColumn = null;
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

    // Créer le message avec le nombre de grilles jouées
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
      console.error('Erreur lors du chargement des données :', error);
    }
  });
  
  // Si je veux utiliser une API pour récupérer les données du Loto
  /*
  onMount(async () => {
    lotoData = await fetchLotoData();
  });
  */

  function parseDate(dateString: string) {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  async function calculateResults() {

    gamesPlayedMessage = "";

    // Validation côté logique avant de calculer les résultats
    if (selectedNumbers.length !== 5 || selectedLuckyNumber === null) {
      message = 'Veuillez sélectionner 5 numéros et un numéro chance.';
      return;
    }

    // Mettre à jour les numéros calculés, distincts des numéros sélectionnés
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

      // Calcul des gains en fonction du nombre de correspondances
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

    // Réinitialisation du tri pour afficher les résultats triés par date en DESC
    sortColumn = 'Date';
    sortOrder = 'desc';  // Tri par défaut DESC
    
    // Attendre que le DOM soit mis à jour avec les résultats pour scroller vers le bas
    await tick();

    // Scroll vers le conteneur de résultats après la génération
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function sortBy(column: string) {
    if (sortColumn === column) {
      // Inverser l'ordre si c'est déjà trié par cette colonne
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      // Si la colonne est "Gain", on commence par "desc", sinon par "asc"
      sortOrder = column === 'Gain' ? 'desc' : 'asc';
    }
    sortDrawResults();
  }

  function sortDrawResults() {
    drawResults = [...drawResults].sort((a, b) => {
      let valueA, valueB;

      // Comparaison principale selon la colonne sélectionnée
      if (sortColumn === 'Date') {
        valueA = parseDate(a.date);
        valueB = parseDate(b.date);
      } else if (sortColumn === 'Gain') {
        valueA = a.gain;
        valueB = b.gain;

        // Si les gains sont égaux, on compare le nombre de bons numéros
        if (valueA === valueB) {
          const matchCountA = a.matchingNumbers.length;
          const matchCountB = b.matchingNumbers.length;

          // Si les nombres de bons numéros sont égaux, on compare le numéro chance
          if (matchCountA === matchCountB) {
            const luckyA = a.matchingLuckyNumber ? 1 : 0;
            const luckyB = b.matchingLuckyNumber ? 1 : 0;

            // Trier par le numéro chance si égalité sur le nombre de bons numéros
            return sortOrder === 'asc' ? luckyA - luckyB : luckyB - luckyA;
          }

          // Trier par le nombre de bons numéros
          return sortOrder === 'asc' ? matchCountA - matchCountB : matchCountB - matchCountA;
        }
      }

      // Comparaison principale (Gain ou Date)
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

  .inline-block {
    display: inline-block;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 4px;
    min-width: 40px; /* Assure que les numéros ont une taille minimale uniforme */
    text-align: center;
  }

  .highlight {
    background-color: #34d399;
    color: white;
  }

  .lucky-number {
    border-color: #d97706;
  }

  .container {
    padding-top: 20px;
  }

  .sort-arrow {
    margin-left: 5px;
  }

  @media (max-width: 600px) {
    .grid-cols-10 {
      grid-template-columns: repeat(5, 1fr);
    }

    .container {
      padding: 10px;
    }

    .text-2xl {
      font-size: 1.5rem;
    }

    .text-xl {
      font-size: 1.25rem;
    }


    .flex {
      flex-wrap: wrap;
    }

    .space-x-4 {
      gap: 8px;
    }

    .overflow-x-auto {
      width: 100%;
      overflow-x: scroll;
    }

  }
</style>

<!-- Affichage HTML -->
<div class="container max-w-5xl mx-auto space-y-4">
  <Card class="p-6">
    <h1 class="text-2xl font-bold">Simulez vos gains au Loto</h1>
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

  {#if message}
    <div class="p-4 mt-4 text-white font-bold" class:bg-green-500={netResult >= 0} class:bg-red-500={netResult < 0}>
      <p>{message}</p>
    </div>
  {/if}

  {#if drawResults.length > 0}
    <div class="mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell class="font-bold cursor-pointer hover:underline px-4 py-2 text-left text-base" on:click={() => sortBy('Date')}>
              Date
              {#if sortColumn === 'Date'}
                <span class="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">Vos numéros</TableCell>
            <TableCell class="font-bold px-4 py-2 text-left text-base">Combinaison gagnante</TableCell>
            <TableCell class="font-bold cursor-pointer hover:underline px-4 py-2 text-left text-base" on:click={() => sortBy('Gain')}>
              Gain
              {#if sortColumn === 'Gain'}
                <span class="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each drawResults as result}
            <TableRow>
              <!-- Colonne Date -->
              <TableCell>{result.date}</TableCell>

              <!-- Colonne Vos numéros -->
              <TableCell>
                {#each calculatedNumbers as num}
                  <span class="inline-block p-2 m-1 border rounded {result.matchingNumbers.includes(num) ? 'highlight' : ''}">
                    {num}
                  </span>
                {/each}
                <span class="inline-block p-2 m-1 border rounded lucky-number {result.matchingLuckyNumber ? 'highlight' : ''}">
                  {calculatedLuckyNumber}
                </span>
              </TableCell>
      
              <!-- Colonne Combinaison gagnante -->
              <TableCell>
                {#each result.draw as num}
                  <span class="inline-block p-2 m-1 border rounded">{num}</span>
                {/each}
                <span class="inline-block p-2 m-1 border rounded lucky-number">{result.chance}</span>
              </TableCell>
      
              <!-- Colonne Gain -->
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
