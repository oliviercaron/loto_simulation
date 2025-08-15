<script lang="ts">
  /* ----------------------------------------------------------------------------
     Imports
     - onMount : pour charger les données au montage
     - tick    : pour forcer Svelte à “flusher” les mises à jour du DOM avant
                 de lancer un calcul coûteux (améliore l'INP)
     --------------------------------------------------------------------------- */
  import { onMount, tick } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card/card.svelte';
  import { base } from '$app/paths';

  /* ----------------------------------------------------------------------------
     Stores et actions de l’app
     - On lit l’état (numéros choisis, résultats, etc.)
     - On déclenche les actions (calcul, reset, génération aléatoire…)
     --------------------------------------------------------------------------- */
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

  /* ----------------------------------------------------------------------------
     Composants de l’UI
     --------------------------------------------------------------------------- */
  import NumberSelector from '$lib/components/NumberSelector.svelte';
  import LuckyNumberSelector from '$lib/components/LuckyNumberSelector.svelte';
  import StatisticsCard from '$lib/components/StatisticsCard.svelte';
  import ResultsTable from '$lib/components/ResultsTable.svelte';

  /* ----------------------------------------------------------------------------
     État local du composant
     - resultsContainer : ancre pour scroller vers la zone de résultats
     - calculatedNumbers / calculatedLuckyNumber : copie “gelée” des valeurs
       sélectionnées au moment du calcul afin d’afficher clairement “avec quoi”
       les résultats ont été obtenus.
     - loading : drapeau pour indiquer qu’un calcul long est en cours
                 (empêche les double-clics, désactive les boutons, etc.)
     --------------------------------------------------------------------------- */
  let resultsContainer: HTMLElement;
  let calculatedNumbers: number[] = [];
  let calculatedLuckyNumber: number | null = null;
  let loading = false;

  /* ----------------------------------------------------------------------------
     Calcul “simple” et scroll
     - Déclenche le calcul de résultats synchrones
     - Attend un tick pour que le DOM reflète l’état (ex. tableau)
     - Scrolle vers le conteneur des résultats pour un meilleur confort
     --------------------------------------------------------------------------- */
  async function calculateWithScroll() {
    lotoActions.calculateResults();
    await tick(); // s’assurer que Svelte a bien rendu les résultats
    calculatedNumbers = $selectedNumbers;
    calculatedLuckyNumber = $selectedLuckyNumber;
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /* ----------------------------------------------------------------------------
     “Jouer jusqu’à gagner” avec bon INP (Interaction to Next Paint)
     - Problème d’origine : une boucle lourde bloquait le thread principal
       → la page ne pouvait pas peindre juste après le clic → INP “poor”.
     - Solution :
       1) passer loading = true pour désactiver le bouton + feedback visuel
       2) await tick() pour forcer Svelte à appliquer ce changement au DOM
       3) await requestAnimationFrame() pour laisser le navigateur PEINDRE
          (c’est la clé pour avoir un paint immédiat après l’interaction)
       4) appeler la version “chunkée” de l’algorithme (playUntilWinOptimized)
          qui travaille par paquets et rend la main entre deux → UI fluide
     - À la fin, on met à jour les numéros affichés et on scrolle vers les résultats
     --------------------------------------------------------------------------- */
  async function playUntilWinWithScroll() {
    if (loading) return;             // anti double-clic
    loading = true;                  // 1) désactive le bouton + feedback visuel
    await tick();                    // 2) appliquer le disabled/spinner au DOM
    await new Promise(requestAnimationFrame); // 3) laisser le navigateur peindre
    await lotoActions.playUntilWinOptimized(); // 4) calcul non-bloquant (chunké)

    // Une fois le calcul fini, on fige les valeurs utilisées pour l’affichage
    await tick();
    calculatedNumbers = $selectedNumbers;
    calculatedLuckyNumber = $selectedLuckyNumber;

    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    loading = false;
  }

  /* ----------------------------------------------------------------------------
     Tri des résultats (relai vers l’action du store)
     --------------------------------------------------------------------------- */
  function sortBy(column: string) {
    lotoActions.sortBy(column);
  }

  /* ----------------------------------------------------------------------------
     Chargement des données au montage
     - “base” vient de $app/paths (utile si l’app est servie sous un sous-chemin,
       ex. GitHub Pages : /loto_simulation)
     --------------------------------------------------------------------------- */
  onMount(() => {
    lotoActions.loadData(base);
  });
</script>

<!-- ----------------------------------------------------------------------------
     Mise en page
     --------------------------------------------------------------------------- -->
<div class="pt-5 pb-8 max-w-5xl mx-auto space-y-4 px-4">
  <Card class="p-6">
    <h1 class="text-2xl font-bold">Simulez vos gains au Loto</h1>
    <p class="text-gray-600">
      Imaginez que vous jouez les mêmes numéros depuis mars 2017...
    </p>
  </Card>

  <Card class="p-6">
    <!-- Sélection des 5 numéros -->
    <NumberSelector
      numbers={numbers}
      selectedNumbers={$selectedNumbers}
      maxSelection={5}
      title="Choisissez les 5 numéros"
      onToggle={lotoActions.toggleNumber}
    />
  </Card>

  <Card class="p-6">
    <!-- Sélection du numéro Chance -->
    <LuckyNumberSelector
      luckyNumbers={luckyNumbers}
      selectedLuckyNumber={$selectedLuckyNumber}
      onSelect={lotoActions.selectLuckyNumber}
    />
  </Card>

  <!-- Barre d’actions : calcul, reset, aléatoire, jouer jusqu’à gagner -->
  <!-- bind:this={resultsContainer} nous sert d’ancre pour scroller après calcul -->
  <div
    class="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4"
    bind:this={resultsContainer}
  >
    <Button
      on:click={calculateWithScroll}
      disabled={!$isSelectionComplete || loading}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Calculer les résultats
    </Button>

    <Button
      variant="outline"
      on:click={lotoActions.reset}
      disabled={loading}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Réinitialiser
    </Button>

    <Button
      variant="outline"
      on:click={lotoActions.generateRandomNumbers}
      disabled={loading}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      Numéros aléatoires
    </Button>

    <!--
      Bouton “Jouer jusqu’à gagner”
      - disabled={loading} : évite les doubles clics et informe l’utilisateur
      - aria-busy : accessibilité (annonce “occupé” aux lecteurs d’écran)
      - Texte dynamique : “Recherche…” pendant l’exécution
    -->
    <Button
      on:click={playUntilWinWithScroll}
      disabled={loading}
      aria-busy={loading}
      class="px-4 py-2 min-h-[50px] active:scale-95 active:shadow-sm transition-all duration-100"
    >
      {#if loading}Recherche…{/if}
      {#if !loading}Jouer jusqu'à gagner{/if}
    </Button>
  </div>

  <!-- Statistiques principales -->
  <StatisticsCard
    totalSpent={$totalSpent}
    totalWon={$totalWon}
    netResult={$netResult}
  />

  <!-- Affichage des résultats si dispo -->
  {#if $drawResults.length > 0}
    {#if $gamesPlayedMessage}
      <div class="mt-4">
        <div class="flex items-center justify-center p-4 bg-red-100 text-red-800 border-l-4 border-red-500 shadow-lg rounded-lg">
          <!-- On utilise {@html} car le message contient du HTML (gras) -->
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
