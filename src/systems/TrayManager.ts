export type PlacementResult = 'correct' | 'wrong' | 'locked' | 'empty';

export interface TraySlot {
  index: number;
  expectedLetter: string;
  placedLetter: string | null;
  locked: boolean;
}

export default class TrayManager {
  private slots: TraySlot[] = [];
  private targetWord = '';

  setup(word: string): void {
    this.targetWord = word.toUpperCase();
    this.slots = this.targetWord.split('').map((letter, index) => ({
      index,
      expectedLetter: letter,
      placedLetter: null,
      locked: false,
    }));
  }

  getTargetWord(): string {
    return this.targetWord;
  }

  getSlots(): TraySlot[] {
    return this.slots;
  }

  getSlotCount(): number {
    return this.slots.length;
  }

  validate(letter: string, slotIndex: number): PlacementResult {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return 'empty';
    }

    const slot = this.slots[slotIndex];
    if (slot.locked) return 'locked';

    const upper = letter.toUpperCase();
    if (upper === slot.expectedLetter) {
      slot.placedLetter = upper;
      slot.locked = true;
      return 'correct';
    }

    return 'wrong';
  }

  isComplete(): boolean {
    return this.slots.every((s) => s.locked);
  }

  getFilledCount(): number {
    return this.slots.filter((s) => s.locked).length;
  }

  getNextSlotIndex(): number {
    const next = this.slots.find((s) => !s.locked);
    return next?.index ?? -1;
  }

  getNextExpectedLetter(): string | null {
    const next = this.slots.find((s) => !s.locked);
    return next?.expectedLetter ?? null;
  }
}