import type { Flashcard, GenerationType } from '../types';

export interface HistoryItem {
  id: string;
  timestamp: number;
  sourceText: string;
  cards: Flashcard[];
  generationType: GenerationType;
}

const HISTORY_KEY = 'quickflash_ai_history';

export const loadHistory = (): HistoryItem[] => {
  try {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};

export const saveHistory = (sourceText: string, cards: Flashcard[], generationType: GenerationType): HistoryItem[] => {
  const history = loadHistory();
  const newHistoryItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: Date.now(),
    sourceText,
    cards,
    generationType
  };
  const updatedHistory = [newHistoryItem, ...history].slice(0, 50); // Limit history size
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
  return updatedHistory;
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
};
