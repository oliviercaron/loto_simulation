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

// Stores principaux
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

// Constantes
export const TICKET_PRICE = 2.2;

// =======================
// === MODIFICATION ICI ===
// =======================
// Le montant dépensé dépend maintenant des résultats affichés, et non plus de la sélection.
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

// Constantes pour l'UI
export const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
export const luckyNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

// Actions du store
export const lotoActions = {
  // Charger les données CSV
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

  // Toggle un numéro dans la sélection
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

  // Sélectionner le numéro chance
  selectLuckyNumber(number: number) {
    selectedLuckyNumber.set(number);
  },

  // Générer des numéros aléatoires
  generateRandomNumbers() {
    const randomNums = generateRandomNumbers(5, 49);
    selectedNumbers.set(randomNums);
    selectedLuckyNumber.set(Math.floor(Math.random() * 10) + 1);
  },

  // Calculer les résultats
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
      const matchCount = popcount32(userMask.low & draw.maskLow) +
                         popcount32(userMask.high & draw.maskHigh);
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

  playUntilWinOptimized() {
    const currentLotoData = get(lotoData);

    const totalCost = currentLotoData.length * TICKET_PRICE;
    let gamesPlayed = 0;
    const maxAttempts = 20000;
    
    let winningNumbers: number[] = [];
    let winningLuckyNumber: number | null = null;
    
    while (gamesPlayed < maxAttempts) {
        gamesPlayed++;
        const currentNumbers = generateRandomNumbers(5, 49);
        const currentLuckyNumber = Math.floor(Math.random() * 10) + 1;
        const userMask = numbersToBitmask32(currentNumbers);
        let totalWonForThisGrid = 0;

        for (const draw of currentLotoData) {
            const matchCount = popcount32(userMask.low & draw.maskLow) + popcount32(userMask.high & draw.maskHigh);
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

    if (winningNumbers.length > 0 && winningLuckyNumber !== null) {
        selectedNumbers.set(winningNumbers);
        selectedLuckyNumber.set(winningLuckyNumber);
        this.calculateResults();
        gamesPlayedMessage.set(`Il vous aurait fallu jouer <b>${gamesPlayed.toLocaleString('fr-FR')}</b> grilles pour en obtenir une rentable.`);
    } else {
        gamesPlayedMessage.set(`Aucune grille rentable trouvée après <b>${maxAttempts.toLocaleString('fr-FR')}</b> essais.`);
    }
},

  // Fonction de tri
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

  // Trier les résultats
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

  // Réinitialiser
  reset() {
    selectedNumbers.set([]);
    selectedLuckyNumber.set(null);
    drawResults.set([]);
    gamesPlayedMessage.set("");
    sortColumn.set('Date');
    sortOrder.set('desc');
  }
};