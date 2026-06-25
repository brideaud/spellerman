export default class ParticleEffects {
  private layer = document.getElementById('particle-layer')!;
  private flash = document.getElementById('flash-overlay')!;

  burst(x: number, y: number, count = 25): void {
    for (let i = 0; i < count; i++) {
      const token = document.createElement('div');
      token.className = 'token';
      token.style.left = `${x}px`;
      token.style.top = `${y}px`;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 60 + Math.random() * 80;
      token.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      token.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      this.layer.appendChild(token);
      setTimeout(() => token.remove(), 700);
    }
  }

  megaBurst(): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 50; i++) {
      const token = document.createElement('div');
      token.className = 'token';
      token.style.width = `${10 + Math.random() * 12}px`;
      token.style.height = token.style.width;
      token.style.left = `${cx}px`;
      token.style.top = `${cy}px`;
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 200;
      token.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      token.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      this.layer.appendChild(token);
      setTimeout(() => token.remove(), 900);
    }
  }

  showFloatingText(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'floating-reward';
    el.textContent = text;
    el.style.color = color;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  confetti(): void {
    const colors = ['#ffd700', '#ff6b9d', '#4fc3f7', '#81c784', '#ffa726'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = '-10px';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      this.layer.appendChild(piece);
      setTimeout(() => piece.remove(), 2500);
    }
  }

  flashScreen(): void {
    this.flash.classList.add('active');
    setTimeout(() => this.flash.classList.remove('active'), 200);
  }

  goldFlash(): void {
    this.flash.style.background = 'rgba(255, 215, 0, 0.55)';
    this.flash.classList.add('active');
    setTimeout(() => {
      this.flash.classList.remove('active');
      this.flash.style.background = 'rgba(255,255,200,0.5)';
    }, 250);
  }
}