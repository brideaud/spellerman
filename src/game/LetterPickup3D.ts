import * as THREE from 'three';

export function createLetterTexture(letter: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#c4a66a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  ctx.fillStyle = '#ffffff44';
  ctx.fillRect(10, 10, size - 20, 36);

  ctx.fillStyle = '#3d2914';
  ctx.font = 'bold 80px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2 + 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Portrait texture for upright rack tiles */
export function createStandingLetterTexture(letter: string): THREE.CanvasTexture {
  const w = 96;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c4a66a';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.fillStyle = '#1a0f05';
  ctx.font = 'bold 80px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, w / 2, h / 2 + 4);
  ctx.strokeStyle = '#3d2914';
  ctx.lineWidth = 2;
  ctx.strokeText(letter, w / 2, h / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export default class LetterPickup3D {
  readonly letter: string;
  readonly origin: THREE.Vector3;
  readonly mesh: THREE.Group;
  pickedUp = false;
  private bobOffset = Math.random() * Math.PI * 2;
  private glowRing!: THREE.Mesh;
  private letterSprite!: THREE.Sprite;

  constructor(letter: string, x: number, z: number) {
    this.letter = letter.toUpperCase();
    this.origin = new THREE.Vector3(x, 0, z);
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.origin);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xc4a66a }),
    );
    base.position.y = 0.11;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    const tex = createLetterTexture(this.letter);
    this.letterSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true }),
    );
    this.letterSprite.scale.set(1.3, 1.3, 1);
    this.letterSprite.position.y = 1.05;
    this.mesh.add(this.letterSprite);

    this.glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.75, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.04;
    this.mesh.add(this.glowRing);
  }

  update(time: number): void {
    if (this.pickedUp) return;
    const bob = Math.sin(time * 2.5 + this.bobOffset) * 0.12;
    this.mesh.position.y = bob;
    this.letterSprite.position.y = 1.05 + bob;
    (this.glowRing.material as THREE.MeshBasicMaterial).opacity =
      0.25 + Math.sin(time * 3 + this.bobOffset) * 0.15;
  }

  pickUp(): void {
    this.pickedUp = true;
    this.mesh.visible = false;
  }

  returnToOrigin(): void {
    this.pickedUp = false;
    this.mesh.position.copy(this.origin);
    this.mesh.visible = true;
  }

  distanceTo(pos: THREE.Vector3): number {
    const dx = this.origin.x - pos.x;
    const dz = this.origin.z - pos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}