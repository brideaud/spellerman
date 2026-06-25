export default class SpeechManager {
  private rate = 0.92;
  private pitch = 1.0;
  private speaking = false;
  private voice: SpeechSynthesisVoice | null = null;
  private voicesReady = false;

  speak(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    this.ensureVoice();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = 1;
    if (this.voice) utterance.voice = this.voice;

    this.speaking = true;
    utterance.onend = () => {
      this.speaking = false;
      onEnd?.();
    };
    utterance.onerror = () => {
      this.speaking = false;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  announceWord(word: string, onEnd?: () => void): void {
    this.speak(`Spell the word: ${word}`, onEnd);
  }

  sayOops(): void {
    this.speak('Oops, try again!');
  }

  sayLetter(letter: string): void {
    this.speak(letter);
  }

  sayGreatJob(onEnd?: () => void): void {
    this.speak('Great job!', onEnd);
  }

  stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speaking = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  warmUp(): void {
    if (!('speechSynthesis' in window)) return;
    this.pickVoice();
    window.speechSynthesis.onvoiceschanged = () => this.pickVoice();
    // Chrome loads voices async — nudge it
    window.speechSynthesis.getVoices();
  }

  private ensureVoice(): void {
    if (!this.voicesReady) this.pickVoice();
  }

  private pickVoice(): void {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    const ranked = voices
      .filter((v) => v.lang.startsWith('en'))
      .map((v) => ({ voice: v, score: this.scoreVoice(v) }))
      .sort((a, b) => b.score - a.score);

    this.voice = ranked[0]?.voice ?? null;
    this.voicesReady = true;
  }

  private scoreVoice(v: SpeechSynthesisVoice): number {
    const n = v.name;
    const lang = v.lang;
    let score = 0;

    if (/natural|neural|premium|enhanced/i.test(n)) score += 50;
    if (/Microsoft.*(Aria|Jenny|Natasha|Emma|Ana)/i.test(n)) score += 45;
    if (/Google.*(US|UK) English/i.test(n)) score += 40;
    if (/Samantha|Karen|Moira|Tessa|Victoria|Allison/i.test(n)) score += 35;
    if (/Daniel|Alex|Tom/i.test(n)) score += 20;
    if (lang === 'en-US') score += 15;
    else if (lang.startsWith('en')) score += 8;
    if (/female|woman/i.test(n)) score += 5;
    if (v.localService) score += 3;
    if (/Zira|David|Mark/i.test(n)) score -= 10; // older robotic voices

    return score;
  }

  getVoiceName(): string | null {
    return this.voice?.name ?? null;
  }
}