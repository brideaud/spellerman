import wordsData from '../data/words-grade3.json';

export interface WordEntry {
  word: string;
  hint: string | null;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default class WordManager {
  private pool: WordEntry[] = [];
  private used: Set<string> = new Set();

  constructor() {
    this.resetPool();
  }

  private resetPool(): void {
    this.pool = [...wordsData].sort(() => Math.random() - 0.5);
    this.used.clear();
  }

  getNextWord(): WordEntry {
    if (this.pool.length === 0) {
      this.resetPool();
    }
    const entry = this.pool.pop()!;
    this.used.add(entry.word);
    return entry;
  }

  getLettersForWord(word: string): string[] {
    return word.toUpperCase().split('');
  }

  getDecoyLetters(word: string, count?: number): string[] {
    const wordLetters = new Set(word.toUpperCase().split(''));
    const available = ALPHABET.split('').filter((l) => !wordLetters.has(l));
    const decoyCount = count ?? Math.min(3, Math.max(2, Math.floor(word.length / 2)));
    const decoys: string[] = [];

    while (decoys.length < decoyCount && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      decoys.push(available.splice(idx, 1)[0]);
    }

    return decoys;
  }

  getAllMapLetters(word: string): string[] {
    const letters = this.getLettersForWord(word);
    const decoys = this.getDecoyLetters(word);
    return [...letters, ...decoys].sort(() => Math.random() - 0.5);
  }
}