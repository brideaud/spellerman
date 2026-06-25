export interface MoveInput {
  x: number;
  z: number;
}

export default class InputManager {
  private keys = new Set<string>();
  private interactPressed = false;

  constructor() {
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

    const actionBtn = document.getElementById('action-btn');
    actionBtn?.addEventListener('click', () => {
      this.interactPressed = true;
    });
  }

  endFrame(): void {
    // reserved for per-frame input cleanup
  }

  getMovement(): MoveInput {
    let x = 0;
    let z = 0;

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