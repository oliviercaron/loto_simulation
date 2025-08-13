// Types de base
export interface LotoGains {
  rang1: number;
  rang2: number;
  rang3: number;
  rang4: number;
  rang5: number;
  rang6: number;
  rang7: number;
  rang8: number;
  rang9: number;
}

export interface LotoData {
  date: string;
  draw: number[];
  maskLow: number;
  maskHigh: number;
  chance: number;
  gains: LotoGains;
}

export interface DrawResult extends LotoData {
  matchingNumbers: number[];
  matchingLuckyNumber: boolean;
  gain: number;
}

// Types pour les composants
export interface NumberSelectorProps {
  numbers: number[];
  selectedNumbers: number[];
  maxSelection: number;
  title: string;
  gridCols?: string;
  onToggle: (number: number) => void;
}

export interface LuckyNumberSelectorProps {
  luckyNumbers: number[];
  selectedLuckyNumber: number | null;
  onSelect: (number: number) => void;
}

export interface StatisticsCardProps {
  totalSpent: number;
  totalWon: number;
  netResult: number;
}

export interface NumberDisplayProps {
  numbers: number[];
  luckyNumber: number;
  matchingNumbers?: number[];
  matchingLuckyNumber?: boolean;
  forceDesktopLayout?: boolean;
}

export interface ResultsTableProps {
  drawResults: DrawResult[];
  calculatedNumbers: number[];
  calculatedLuckyNumber: number | null;
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  forceDesktopLayout?: boolean;
}

// Types pour le tri
export type SortColumn = 'Date' | 'Gain';
export type SortOrder = 'asc' | 'desc';

// Types pour les événements
export interface SortEvent {
  column: SortColumn;
}

// Constantes typées
export const LOTTERY_CONSTANTS = {
  TICKET_PRICE: 2.2,
  MAX_NUMBERS: 49,
  MAX_LUCKY_NUMBERS: 10,
  SELECTION_COUNT: 5,
  MIN_DATE: new Date('2017-03-06')
} as const;