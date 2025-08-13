// Fonctions de manipulation de bits optimisées
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

export function popcount32(x: number): number {
  return popcountLookup[x & 0xff] +
         popcountLookup[(x >>> 8) & 0xff] +
         popcountLookup[(x >>> 16) & 0xff] +
         popcountLookup[(x >>> 24) & 0xff];
}

export function numbersToBitmask32(numbers: number[]): { low: number, high: number } {
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

// Fonctions de parsing
export function parseGain(value: string): number {
  if (!value || value.trim() === '' || value.trim().toUpperCase() === 'NA') {
    return 0;
  }
  const replaced = value.replace(',', '.');
  const parsed = parseFloat(replaced);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseDate(dateString: string): Date {
  const [day, month, year] = dateString.split('/');
  return new Date(`${year}-${month}-${day}`);
}

// Génération de numéros aléatoires
export function generateRandomNumbers(count: number, max: number): number[] {
  const numbers: number[] = [];
  while (numbers.length < count) {
    const random = Math.floor(Math.random() * max) + 1;
    if (!numbers.includes(random)) {
      numbers.push(random);
    }
  }
  return numbers;
}

// Calcul des gains selon les règles du loto
export function calculateGain(
  matchCount: number, 
  matchingLuckyNumber: boolean, 
  gains: any
): number {
  if (matchCount === 5 && matchingLuckyNumber) return gains.rang1;
  if (matchCount === 5) return gains.rang2;
  if (matchCount === 4 && matchingLuckyNumber) return gains.rang3;
  if (matchCount === 4) return gains.rang4;
  if (matchCount === 3 && matchingLuckyNumber) return gains.rang5;
  if (matchCount === 3) return gains.rang6;
  if (matchCount === 2 && matchingLuckyNumber) return gains.rang7;
  if (matchCount === 2) return gains.rang8;
  if (matchCount === 1 && matchingLuckyNumber) return gains.rang9;
  return 0;
}

// Formatage des montants
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}