<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card/card.svelte';
  import { base } from '$app/paths';
  
  // Import du store et des composants
  import {
    selectedNumbers,
    selectedLuckyNumber,
    totalSpent,
    totalWon,
    netResult,
    drawResults,
    gamesPlayedMessage,
    isSelectionComplete,
    sortColumn,
    sortOrder,
    numbers,
    luckyNumbers,
    lotoActions
  } from '$lib/stores/lotoStore';
  import NumberSelector from '$lib/components/NumberSelector.svelte';
  import LuckyNumberSelector from '$lib/components/LuckyNumberSelector.svelte';
  import StatisticsCard from '$lib/components/StatisticsCard.svelte';
  import ResultsTable from '$lib/components/ResultsTable.svelte';

  // Variables locales pour l'UI
  let resultsContainer: HTMLElement;
  let calculatedNumbers: number[] = [];
  let calculatedLuckyNumber: number | null = null;

  // Fonction pour calculer avec scroll
  async function calculateWithScroll() {
    lotoActions.calculateResults();
    await tick();
    calculatedNumbers = $selectedNumbers;
    calculatedLuckyNumber = $selectedLuckyNumber;
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // =======================
  // === MODIFICATION ICI ===
  // =======================
  // On attend (await tick()) que Svelte mette à jour les stores AVANT de lire les valeurs.
  async function playUntilWinWithScroll() {
    lotoActions.playUntilWinOptimized();
    await tick(); // Attendre la mise à jour des stores
    calculatedNumbers = $selectedNumbers;
    calculatedLuckyNumber = $selectedLuckyNumber;
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Fonction de tri
  function sortBy(column: string) {
    lotoActions.sortBy(column);
  }

  // Charger les données au montage
  onMount(() => {
    lotoActions.loadData(base);
  });
</script>

<div class="pt-5 pb-8 max-w-5xl mx-auto space-y-4 px-4">
  <Card class="p-6">
    <h1 class="text-2xl font-bold">Simulez vos gains au Loto</h1>
    <p class="text-gray-600">
      Imaginez que vous jouez les mêmes numéros depuis mars 2017...
    </p>
  </Card>

  <Card class="p-6">
    <NumberSelector
      numbers={numbers}
      selectedNumbers={$selectedNumbers}
      maxSelection={5}
      title="Choisissez les 5 numéros"
      onToggle={lotoActions.toggleNumber}
    />
  </Card>

  <Card class="p-6">
    <LuckyNumberSelector
      luckyNumbers={luckyNumbers}
      selectedLuckyNumber={$selectedLuckyNumber}
      onSelect={lotoActions.selectLuckyNumber}
    />
  </Card>

  <div class="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4" bind:this={resultsContainer}>
    <Button
      on:click={calculateWithScroll}
      disabled={!$isSelectionComplete}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Calculer les résultats
    </Button>
    
    <Button
      variant="outline"
      on:click={lotoActions.reset}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Réinitialiser
    </Button>
    
    <Button
      variant="outline"
      on:click={lotoActions.generateRandomNumbers}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Numéros aléatoires
    </Button>
    
    <Button
      on:click={playUntilWinWithScroll}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Jouer jusqu'à gagner
    </Button>
  </div>

  <StatisticsCard
    totalSpent={$totalSpent}
    totalWon={$totalWon}
    netResult={$netResult}
  />

  {#if $drawResults.length > 0}
    {#if $gamesPlayedMessage}
      <div class="mt-4">
        <div class="flex items-center justify-center p-4 bg-red-100 text-red-800 border-l-4 border-red-500 shadow-lg rounded-lg">
          <p class="font-bold text-lg text-center">{@html $gamesPlayedMessage}</p>
        </div>
      </div>
    {/if}
    
    <ResultsTable
      drawResults={$drawResults}
      {calculatedNumbers}
      {calculatedLuckyNumber}
      sortColumn={$sortColumn}
      sortOrder={$sortOrder}
      on:sort={(e) => sortBy(e.detail)}
    />
  {/if}
</div>