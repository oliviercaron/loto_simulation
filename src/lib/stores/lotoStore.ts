import { writable, derived, get } from 'svelte/store';
import { dsvFormat } from 'd3-dsv';
import type { LotoData, DrawResult } from '$lib/types/lotoTypes';
import {
  popcount32,
  numbersToBitmask32,
  parseGain,
  parseDate,
  generateRandomNumbers,
  calculateGain
} from '$lib/utils/lotoUtils';

/* --------------------------------------
   Stores principaux (état de l’application)
   -------------------------------------- */
export const selectedNumbers = writable<number[]>([]);
export const selectedLuckyNumber = writable<number | null>(null);
export const lotoData = writable<LotoData[]>([]);
export const drawResults = writable<DrawResult[]>([]);
export const gamesPlayedMessage = writable<string>("");
export const sortColumn = writable<string>('Date');
export const sortOrder = writable<'asc' | 'desc'>('desc');

export const isSelectionComplete = derived(
  [selectedNumbers, selectedLuckyNumber],
  ([$selectedNumbers, $selectedLuckyNumber]) => {
    return $selectedNumbers.length === 5 && $selectedLuckyNumber !== null;
  }
);

/* --------------------------------------
   Constantes
   -------------------------------------- */
export const TICKET_PRICE = 2.2;

/* -----------------------------------------------------------------------------
   Agrégats (dépendent des résultats affichés, pas seulement de la sélection)
   ----------------------------------------------------------------------------- */
export const totalSpent = derived([lotoData, drawResults], ([$lotoData, $drawResults]) => {
  return $drawResults.length > 0 ? $lotoData.length * TICKET_PRICE : 0;
});

export const totalWon = derived([drawResults], ([$drawResults]) => {
  return $drawResults.reduce((sum, result) => sum + result.gain, 0);
});

export const totalGamesWon = derived([drawResults], ([$drawResults]) => {
  return $drawResults.filter(result => result.gain > 0).length;
});

export const netResult = derived([totalSpent, totalWon], ([$totalSpent, $totalWon]) => {
  return $totalWon - $totalSpent;
});

/* --------------------------------------
   Constantes pour l’UI
   -------------------------------------- */
export const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
export const luckyNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

/* --------------------------------------
   Actions du store
   -------------------------------------- */
export const lotoActions = {
  /* --------------------------------------------------------------------------
     Chargement des données CSV (séparateur ';')
     - Filtre à partir du 2017-03-06
     - Parse les gains et construit les bitmasks 2×32 pour chaque tirage
     -------------------------------------------------------------------------- */
  async loadData(basePath: string = '') {
    try {
      const response = await fetch(`${basePath}/data/loto_combined.csv`);
      const csvText = await response.text();
      const semicolonParser = dsvFormat(';');
      const parsedData = semicolonParser.parse(csvText);

      const data = parsedData
        .filter((draw: any) => {
          const drawDate = parseDate(draw.date_de_tirage);
          return drawDate >= new Date('2017-03-06');
        })
        .map((draw: any) => {
          const [combinaison, chance] = draw.combinaison_gagnante_en_ordre_croissant.split('+');
          const drawNumbers = combinaison.split('-').map(Number);
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

      lotoData.set(data);
    } catch (error) {
      console.error('Error loading loto data:', error);
    }
  },

  /* --------------------------------------------------------------------------
     Gestion de la sélection (numéros + numéro Chance)
     -------------------------------------------------------------------------- */
  toggleNumber(number: number) {
    selectedNumbers.update(numbers => {
      if (numbers.includes(number)) {
        return numbers.filter(n => n !== number);
      } else {
        if (numbers.length < 5) {
          return [...numbers, number];
        }
        return numbers;
      }
    });
  },

  selectLuckyNumber(number: number) {
    selectedLuckyNumber.set(number);
  },

  generateRandomNumbers() {
    const randomNums = generateRandomNumbers(5, 49);
    selectedNumbers.set(randomNums);
    selectedLuckyNumber.set(Math.floor(Math.random() * 10) + 1);
  },

  /* --------------------------------------------------------------------------
     Calcul des résultats pour la sélection en cours
     - Bitmask 2×32 : (low, high)
     - ET binaire (&) utilisateur vs tirage → bits communs
     - popcount32 sur chaque partie (low/high), puis somme
     -------------------------------------------------------------------------- */
  calculateResults() {
    const currentSelectedNumbers = get(selectedNumbers);
    const currentSelectedLuckyNumber = get(selectedLuckyNumber);
    const currentLotoData = get(lotoData);

    if (currentSelectedNumbers.length !== 5 || currentSelectedLuckyNumber === null) {
      return;
    }

    gamesPlayedMessage.set("");
    const userMask = numbersToBitmask32(currentSelectedNumbers);

    const results = currentLotoData.map((draw) => {
      /* ----------------------------------------------------------------------
         Explication du matching par bitmask (version détaillée) :

         - On encode un ensemble de numéros comme des bits dans deux entiers 32 bits :
             low  (bits 0..30)  = numéros 1..31
             high (bits 0..17)  = numéros 32..49

         - Pour savoir combien de numéros “matchent”, on garde les bits communs
           entre le masque de l’utilisateur et celui du tirage :
             commun_low  = userMask.low  & draw.maskLow
             commun_high = userMask.high & draw.maskHigh

           Exemple binaire simplifié :
             user : 00101100
             draw : 00100110
             AND  : 00100100  → il reste 2 bits à 1 → 2 bons numéros

         - On compte ensuite le nombre de bits à 1 (popcount) dans chaque partie,
           puis on additionne les deux :
             matchCount = popcount32(commun_low) + popcount32(commun_high)

         - Le ">>> 0" force un entier non signé 32 bits avant popcount32 (robuste).
         - Complexité : O(1) par tirage (deux AND + deux popcounts) → O(N) sur N tirages.
         ---------------------------------------------------------------------- */
      const matchCount =
        popcount32(((userMask.low  & draw.maskLow)  >>> 0)) +
        popcount32(((userMask.high & draw.maskHigh) >>> 0));

      const matchingLuckyNumber = (currentSelectedLuckyNumber === draw.chance);
      const gain = calculateGain(matchCount, matchingLuckyNumber, draw.gains);

      return {
        ...draw,
        matchingNumbers: currentSelectedNumbers.filter(num => draw.draw.includes(num)),
        matchingLuckyNumber,
        gain,
      };
    });

    drawResults.set(results);
    sortColumn.set('Date');
    sortOrder.set('desc');
    this.sortDrawResults();
  },

  /* --------------------------------------------------------------------------
     Recherche d’une grille “rentable” (optimisée pour l’INP)
     - Version asynchrone “chunkée” : traite par paquets et rend la main au navigateur
     - Évite de bloquer le thread principal → Interaction to Next Paint beaucoup mieux
     -------------------------------------------------------------------------- */
  async playUntilWinOptimized() {
    const currentLotoData = get(lotoData);
    const totalCost = currentLotoData.length * TICKET_PRICE;

    const maxAttempts = 20000;    // garde-fou
    const BATCH = 200;            // nombre d’essais par frame (à ajuster si besoin)

    let gamesPlayed = 0;
    let winningNumbers: number[] = [];
    let winningLuckyNumber: number | null = null;

    // Petite aide pour redonner la main au navigateur (peinture entre deux paquets)
    const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

    while (gamesPlayed < maxAttempts) {
      // Traiter un “paquet” d’essais
      for (let b = 0; b < BATCH && gamesPlayed < maxAttempts; b++) {
        gamesPlayed++;
        const currentNumbers = generateRandomNumbers(5, 49);
        const currentLuckyNumber = Math.floor(Math.random() * 10) + 1;
        const userMask = numbersToBitmask32(currentNumbers);

        let totalWonForThisGrid = 0;

        for (const draw of currentLotoData) {
          /* ---------------------------------------------------------------
             Même logique bitmask/popcount que dans calculateResults :
             - AND sur low/high → bits communs
             - popcount32(low) + popcount32(high) → nb de bons numéros
             - ">>> 0" pour assurer l’entier non signé 32 bits
             --------------------------------------------------------------- */
          const matchCount =
            popcount32(((userMask.low  & draw.maskLow)  >>> 0)) +
            popcount32(((userMask.high & draw.maskHigh) >>> 0));

          const matchingLuckyNumber = (currentLuckyNumber === draw.chance);
          totalWonForThisGrid += calculateGain(matchCount, matchingLuckyNumber, draw.gains);
        }

        const netResultForThisGrid = totalWonForThisGrid - totalCost;

        if (netResultForThisGrid > 0) {
          winningNumbers = currentNumbers;
          winningLuckyNumber = currentLuckyNumber;
          break;
        }
      }

      // Si trouvé, sortir de la boucle externe
      if (winningNumbers.length > 0 && winningLuckyNumber !== null) break;

      // Laisser le navigateur peindre avant de relancer un paquet
      await nextFrame();
    }

    if (winningNumbers.length > 0 && winningLuckyNumber !== null) {
      selectedNumbers.set(winningNumbers);
      selectedLuckyNumber.set(winningLuckyNumber);
      this.calculateResults();
      gamesPlayedMessage.set(`Il vous aurait fallu jouer <b>${gamesPlayed.toLocaleString('fr-FR')}</b> grilles pour en obtenir <u>finalement une</u> rentable.`);
    } else {
      gamesPlayedMessage.set(`Aucune grille rentable trouvée après <b>${maxAttempts.toLocaleString('fr-FR')}</b> essais.`);
    }
  },

  /* --------------------------------------------------------------------------
     Tri des résultats (colonne / ordre)
     -------------------------------------------------------------------------- */
  sortBy(column: string) {
    const currentSortColumn = get(sortColumn);
    const currentSortOrder = get(sortOrder);

    if (currentSortColumn === column) {
      sortOrder.set(currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      sortColumn.set(column);
      sortOrder.set(column === 'Gain' ? 'desc' : 'asc');
    }
    this.sortDrawResults();
  },

  /* --------------------------------------------------------------------------
     Appliquer le tri aux résultats courants
     -------------------------------------------------------------------------- */
  sortDrawResults() {
    const currentDrawResults = get(drawResults);
    const currentSortColumn = get(sortColumn);
    const currentSortOrder = get(sortOrder);

    const sorted = [...currentDrawResults].sort((a, b) => {
      let valueA: any, valueB: any;
      if (currentSortColumn === 'Date') {
        valueA = parseDate(a.date);
        valueB = parseDate(b.date);
      } else if (currentSortColumn === 'Gain') {
        valueA = a.gain;
        valueB = b.gain;
      }
      if (valueA < valueB) return currentSortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return currentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    drawResults.set(sorted);
  },

  /* --------------------------------------------------------------------------
     Réinitialiser l’état
     -------------------------------------------------------------------------- */
  reset() {
    selectedNumbers.set([]);
    selectedLuckyNumber.set(null);
    drawResults.set([]);
    gamesPlayedMessage.set("");
    sortColumn.set('Date');
    sortOrder.set('desc');
  }
};
