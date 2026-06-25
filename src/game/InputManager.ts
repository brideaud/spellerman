export interface MoveInput {
  x: number;
  z: number;
}

export default class InputManager {
  private keys = new Set<string>();
  private interactPressed = false;
  private touchMove: MoveInput = { x: 0, z: 0 };

  constructor() {
    this.detectMobile();
    this.setupKeyboard();
    this.setupJoystick();
    this.setupActionButton();
  }

  private detectMobile(): void {
    const touch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(max-width: 768px)').matches;

    if (touch) {
      document.getElementById('mobile-controls')?.classList.add('visible');
    }
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Space') {
        this.interactPressed = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  private setupJoystick(): void {
    const zone = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (!zone || !knob) return;

    const maxRadius = 42;
    let active = false;
    let centerX = 0;
    let centerY = 0;

    const update = (clientX: number, clientY: number): void => {
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.touchMove.x = dx / maxRadius;
      this.touchMove.z = dy / maxRadius;
    };

    const reset = (): void => {
      active = false;
      this.touchMove = { x: 0, z: 0 };
      knob.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = true;
      zone.setPointerCapture(e.pointerId);
      const rect = zone.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      update(e.clientX, e.clientY);
    });

    zone.addEventListener('pointermove', (e) => {
      if (!active) return;
      e.preventDefault();
      update(e.clientX, e.clientY);
    });

    zone.addEventListener('pointerup', reset);
    zone.addEventListener('pointercancel', reset);
    zone.addEventListener('lostpointercapture', reset);
  }

  private setupActionButton(): void {
    const btn = document.getElementById('action-btn');
    if (!btn) return;

    const trigger = (e: Event) => {
      e.preventDefault();
      this.interactPressed = true;
    };

    btn.addEventListener('pointerdown', trigger);
    btn.addEventListener('click', (e) => e.preventDefault());
  }

  endFrame(): void {
    // reserved for per-frame input cleanup
  }

  getMovement(): MoveInput {
    let x = this.touchMove.x;
    let z = this.touchMove.z;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x = -1;
    else if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x = 1;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z = -1;
    else if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z = 1;

    if (x !== 0 && z !== 0) {
      const s = 0.707;
      x *= s;
      z *= s;
    }

    return { x, z };
  }

  consumeInteract(): boolean {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }
}