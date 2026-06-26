export default class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    delay = 0,
  ): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  playPickup(): void {
    this.playTone(660, 0.1, 'sine', 0.2);
    this.playTone(880, 0.15, 'sine', 0.15, 0.05);
  }

  playPutDown(): void {
    this.playTone(330, 0.12, 'sine', 0.15);
    this.playTone(220, 0.18, 'sine', 0.1, 0.06);
  }

  playMischief(): void {
    [440, 554, 659, 554].forEach((freq, i) => {
      this.playTone(freq, 0.1, 'square', 0.08, i * 0.07);
    });
  }

  playCorrect(): void {
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.playTone(freq, 0.2, 'square', 0.15, i * 0.1);
    });
  }

  playTrumpet(): void {
    [392, 494, 587, 784].forEach((freq, i) => {
      this.playTone(freq, 0.25, 'square', 0.12, i * 0.12);
    });
  }

  playWrong(): void {
    this.playTone(200, 0.3, 'sawtooth', 0.2);
    this.playTone(150, 0.4, 'sawtooth', 0.15, 0.15);
  }

  playVictory(): void {
    [523, 587, 659, 784, 659, 784, 1047].forEach((freq, i) => {
      this.playTone(freq, 0.18, 'square', 0.12, i * 0.1);
    });
  }

  playSlotLock(): void {
    this.playTone(440, 0.1, 'triangle', 0.2);
    this.playTone(550, 0.15, 'triangle', 0.15, 0.08);
  }

  playAwesome(): void {
    [659, 784, 988, 1175].forEach((freq, i) => {
      this.playTone(freq, 0.15, 'square', 0.1, i * 0.06);
    });
  }
}