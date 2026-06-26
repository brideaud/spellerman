import * as THREE from 'three';
import { createStandingLetterTexture } from './LetterPickup3D';

export interface RackSlot {
  index: number;
  group: THREE.Group;
  highlight: THREE.Mesh;
  landingPos: THREE.Vector3;
  filledTile: THREE.Group | null;
}

const RACK_POS = new THREE.Vector3(0, 0, -11);
const RACK_RANGE = 5.5;
const APPROACH_SOUTH_OFFSET = 2.5;
const GUIDANCE_RANGE = 9;
const TILE_H = 0.88;
const TILE_W = 0.62;
const TILE_D = 0.1;

export default class LetterRack3D {
  readonly group = new THREE.Group();
  private slots: RackSlot[] = [];
  private nextSlotIndex = 0;
  private signSprite!: THREE.Sprite;
  private signShown = false;
  private signTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(scene: THREE.Scene) {
    this.group.position.copy(RACK_POS);
    scene.add(this.group);
    this.buildRackBase();
    this.buildSign();
  }

  private buildRackBase(): void {
    const wood = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
    const legGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    [[-3.5, -0.5], [3.5, -0.5], [-3.5, 0.5], [3.5, 0.5]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(x, 0.45, z);
      leg.castShadow = true;
      this.group.add(leg);
    });

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, 1.4), wood);
    shelf.position.set(0, 0.95, 0);
    shelf.castShadow = true;
    this.group.add(shelf);

    const back = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.1, 0.2), wood);
    back.position.set(0, 1.45, -0.55);
    this.group.add(back);
  }

  private buildSign(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f29400';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LETTER RACK', 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0 });
    this.signSprite = new THREE.Sprite(mat);
    this.signSprite.scale.set(3, 0.75, 1);
    this.signSprite.position.set(0, 2.4, 0.8);
    this.signSprite.visible = false;
    this.group.add(this.signSprite);
  }

  private showSignBriefly(): void {
    if (this.signShown) return;
    this.signShown = true;

    const mat = this.signSprite.material as THREE.SpriteMaterial;
    mat.opacity = 1;
    this.signSprite.visible = true;

    if (this.signTimer) clearTimeout(this.signTimer);
    this.signTimer = setTimeout(() => this.fadeSignOut(), 4000);
  }

  private fadeSignOut(): void {
    const mat = this.signSprite.material as THREE.SpriteMaterial;
    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 700;
      if (t < 1) {
        mat.opacity = 1 - t;
        requestAnimationFrame(animate);
      } else {
        this.signSprite.visible = false;
        mat.opacity = 0;
      }
    };
    requestAnimationFrame(animate);
  }

  setup(slotCount: number): void {
    this.slots.forEach((s) => {
      this.group.remove(s.group);
      s.filledTile?.removeFromParent();
    });
    this.slots = [];
    this.nextSlotIndex = 0;

    this.showSignBriefly();

    const slotW = Math.min(0.95, 7 / slotCount);
    const totalW = slotCount * slotW + (slotCount - 1) * 0.12;
    const startX = -totalW / 2 + slotW / 2;

    for (let i = 0; i < slotCount; i++) {
      const slotGroup = new THREE.Group();
      slotGroup.position.set(startX + i * (slotW + 0.12), 1.05, 0.35);

      const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(slotW, TILE_H + 0.12, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x6b4226 }),
      );
      backPanel.position.set(0, TILE_H / 2, -0.12);
      slotGroup.add(backPanel);

      const highlight = new THREE.Mesh(
        new THREE.BoxGeometry(slotW + 0.1, TILE_H + 0.14, 0.04),
        new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      highlight.position.set(0, TILE_H / 2, 0.42);
      highlight.renderOrder = 1;
      slotGroup.add(highlight);

      this.group.add(slotGroup);

      const landingPos = new THREE.Vector3();
      slotGroup.getWorldPosition(landingPos);
      landingPos.y += TILE_H * 0.55;

      this.slots.push({
        index: i,
        group: slotGroup,
        highlight,
        landingPos,
        filledTile: null,
      });
    }

    this.updateSelection();
  }

  private buildStandingTile(letter: string): THREE.Group {
    const tile = new THREE.Group();
    tile.position.set(0, 0, 0.15);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_W, TILE_H, TILE_D * 1.5),
      new THREE.MeshLambertMaterial({ color: 0xf5e6c8 }),
    );
    body.position.y = TILE_H / 2;
    body.castShadow = true;
    tile.add(body);

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_W + 0.05, TILE_H + 0.05, TILE_D * 1.2),
      new THREE.MeshLambertMaterial({ color: 0xc4a66a }),
    );
    edge.position.set(0, TILE_H / 2, -0.02);
    tile.add(edge);

    const tex = createStandingLetterTexture(letter);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }),
    );
    sprite.scale.set(TILE_W * 0.95, TILE_H * 0.82, 1);
    sprite.position.set(0, TILE_H * 0.56, 0.12);
    sprite.renderOrder = 2;
    tile.add(sprite);

    tile.rotation.x = -0.1;
    tile.renderOrder = 2;

    return tile;
  }

  getSlotCount(): number {
    return this.slots.length;
  }

  setNextSlot(index: number): void {
    this.nextSlotIndex = index;
    this.updateSelection();
  }

  getNextSlotIndex(): number {
    return this.nextSlotIndex;
  }

  private updateSelection(): void {
    this.slots.forEach((s, i) => {
      const mat = s.highlight.material as THREE.MeshBasicMaterial;
      if (s.filledTile) {
        mat.opacity = 0;
      } else if (i === this.nextSlotIndex) {
        mat.opacity = 0.55;
        mat.color.setHex(0xffd700);
      } else {
        mat.opacity = 0;
      }
    });
  }

  isPlayerInRange(playerPos: THREE.Vector3): boolean {
    const dx = playerPos.x - RACK_POS.x;
    const dz = playerPos.z - RACK_POS.z;
    return Math.sqrt(dx * dx + dz * dz) < RACK_RANGE && playerPos.z < RACK_POS.z + 2;
  }

  isInGuidanceZone(playerPos: THREE.Vector3, slotIndex: number): boolean {
    const approach = this.getApproachTarget(slotIndex);
    const dist = Math.hypot(playerPos.x - approach.x, playerPos.z - approach.z);
    return dist < GUIDANCE_RANGE && playerPos.z > RACK_POS.z - 1.5;
  }

  getApproachTarget(slotIndex: number): THREE.Vector3 {
    const slot = this.slots[slotIndex];
    if (!slot) return RACK_POS.clone();

    const slotWorld = new THREE.Vector3();
    slot.group.getWorldPosition(slotWorld);
    return new THREE.Vector3(slotWorld.x, 0, slotWorld.z + APPROACH_SOUTH_OFFSET);
  }

  getGuidanceStrength(playerPos: THREE.Vector3, slotIndex: number): number {
    const approach = this.getApproachTarget(slotIndex);
    const distToSpot = Math.hypot(playerPos.x - approach.x, playerPos.z - approach.z);
    const proximity = 1 - Math.min(distToSpot / GUIDANCE_RANGE, 1);
    const misaligned = Math.min(distToSpot / 3.5, 1);

    return proximity * (0.25 + misaligned * 0.55);
  }

  getThrowTarget(index: number): THREE.Vector3 {
    return this.slots[index]?.landingPos.clone() ?? RACK_POS.clone();
  }

  placeLetter(index: number, letter: string): THREE.Vector3 {
    const slot = this.slots[index];
    if (!slot) return RACK_POS.clone();

    if (slot.filledTile) {
      slot.group.remove(slot.filledTile);
    }

    const tile = this.buildStandingTile(letter);
    slot.group.add(tile);
    slot.filledTile = tile;
    this.updateSelection();

    return slot.landingPos.clone();
  }

  flashWrong(index: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    const mat = slot.highlight.material as THREE.MeshBasicMaterial;
    mat.color.setHex(0xff3333);
    mat.opacity = 0.7;
    setTimeout(() => this.updateSelection(), 400);
  }

  getRackPosition(): THREE.Vector3 {
    return RACK_POS.clone();
  }

  pulseCorrect(index: number): void {
    const slot = this.slots[index];
    if (!slot?.filledTile) return;
    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 400;
      if (t < 1) {
        const s = 1 + Math.sin(t * Math.PI) * 0.2;
        slot.filledTile!.scale.set(s, s, s);
        requestAnimationFrame(animate);
      } else {
        slot.filledTile!.scale.set(1, 1, 1);
      }
    };
    requestAnimationFrame(animate);
  }
}