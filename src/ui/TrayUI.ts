import TrayManager from '../systems/TrayManager';

export default class TrayUI {
  private panel = document.getElementById('tray-panel')!;
  private hint = document.getElementById('hint-text')!;
  private progress = document.getElementById('progress-text')!;

  setup(trayManager: TrayManager): void {
    this.panel.innerHTML = '';
    trayManager.getSlots().forEach((slot) => {
      const el = document.createElement('div');
      el.className = 'tray-slot';
      el.dataset.index = String(slot.index);

      const underscore = document.createElement('span');
      underscore.className = 'underscore';
      underscore.textContent = '_';

      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.style.display = 'none';

      el.append(underscore, letter);
      this.panel.appendChild(el);
    });
  }

  showCorrect(slotIndex: number, letter: string): void {
    const el = this.getSlotEl(slotIndex);
    if (!el) return;
    el.classList.add('correct');
    el.classList.remove('wrong');
    const letterEl = el.querySelector('.letter') as HTMLElement;
    const underscore = el.querySelector('.underscore') as HTMLElement;
    letterEl.textContent = letter;
    letterEl.style.display = 'block';
    underscore.style.display = 'none';
    el.style.transform = 'scale(1.2)';
    setTimeout(() => { el.style.transform = ''; }, 200);
  }

  showWrong(slotIndex: number): void {
    const el = this.getSlotEl(slotIndex);
    if (!el) return;
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 400);
  }

  setHint(text: string): void {
    if (text) {
      this.hint.textContent = text;
      this.hint.classList.add('visible');
    } else {
      this.hint.classList.remove('visible');
    }
  }

  setProgress(text: string): void {
    this.progress.textContent = text;
  }

  private getSlotEl(index: number): HTMLElement | null {
    return this.panel.querySelector(`[data-index="${index}"]`);
  }
}