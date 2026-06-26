import * as THREE from 'three';
import LetterPickup3D from './LetterPickup3D';
import World from './World';

const SPEED = 4.5;
const SHUFFLE_COOLDOWN = 14;
const APPROACH_DIST = 1.6;
const FLEE_DIST = 2.8;

type State = 'idle' | 'hunt' | 'shuffle' | 'flee';

export default class Adversary3D {
  readonly group: THREE.Group;
  private body!: THREE.Mesh;
  private head!: THREE.Mesh;
  private walkPhase = 0;
  private targetRotation = 0;
  private state: State = 'idle';
  private idleTimer = 5;
  private targetLetter: LetterPickup3D | null = null;
  private fleeDir = new THREE.Vector3();
  private shuffleBusy = false;
  private nameplate!: THREE.Sprite;

  constructor() {
    this.group = new THREE.Group();
    this.buildCharacter();
    this.group.position.set(-6, 0, 2);
  }

  private buildCharacter(): void {
    const skin = new THREE.MeshLambertMaterial({ color: 0xf4a582 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
    const hair = new THREE.MeshLambertMaterial({ color: 0xe67e22 });

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.42), shirt);
    this.body.position.y = 1.05;
    this.body.castShadow = true;
    this.group.add(this.body);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), skin);
    this.head.position.y = 1.65;
    this.head.castShadow = true;
    this.group.add(this.head);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
    );
    hairCap.position.y = 1.72;
    this.group.add(hairCap);

    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    leftEye.position.set(-0.11, 1.68, 0.3);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    rightEye.position.set(0.11, 1.68, 0.3);
    this.group.add(leftEye, rightEye);

    const grin = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x5c3d1e }),
    );
    grin.position.set(0, 1.58, 0.32);
    grin.rotation.x = Math.PI;
    this.group.add(grin);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(155, 89, 182, 0.9)';
    ctx.fillRect(4, 4, 120, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scrambler', 64, 16);
    const tex = new THREE.CanvasTexture(canvas);
    this.nameplate = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    this.nameplate.scale.set(2.2, 0.55, 1);
    this.nameplate.position.y = 2.35;
    this.group.add(this.nameplate);
  }

  reset(): void {
    this.state = 'idle';
    this.idleTimer = 4;
    this.targetLetter = null;
    this.shuffleBusy = false;
    this.group.position.set(-6, 0, 2);
  }

  isBusy(): boolean {
    return this.shuffleBusy || this.state === 'shuffle';
  }

  update(
    dt: number,
    letters: LetterPickup3D[],
    playerPos: THREE.Vector3,
    world: World,
    onShuffled: (letter: LetterPickup3D) => void,
    findNewSpot: (letter: LetterPickup3D) => { x: number; z: number } | null,
  ): void {
    const distToPlayer = this.group.position.distanceTo(playerPos);

    if (this.state !== 'shuffle' && distToPlayer < FLEE_DIST) {
      this.state = 'flee';
      const away = this.group.position.clone().sub(playerPos);
      away.y = 0;
      if (away.length() < 0.01) away.set(1, 0, 0);
      this.fleeDir.copy(away.normalize());
      this.targetLetter = null;
    }

    if (this.state === 'idle') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        const available = letters.filter((l) => !l.pickedUp && !l.isShuffling());
        if (available.length >= 2) {
          this.targetLetter = available[Math.floor(Math.random() * available.length)];
          this.state = 'hunt';
        } else {
          this.idleTimer = SHUFFLE_COOLDOWN;
        }
      }
      this.bobIdle();
      return;
    }

    if (this.state === 'flee') {
      this.move(this.fleeDir.x, this.fleeDir.z, dt, SPEED * 1.3);
      world.clampPosition(this.group.position);
      if (distToPlayer > FLEE_DIST + 2) {
        this.state = 'idle';
        this.idleTimer = SHUFFLE_COOLDOWN * 0.5;
      }
      return;
    }

    if (this.state === 'hunt' && this.targetLetter) {
      if (this.targetLetter.pickedUp) {
        this.state = 'idle';
        this.idleTimer = SHUFFLE_COOLDOWN;
        this.targetLetter = null;
        return;
      }

      const tx = this.targetLetter.origin.x;
      const tz = this.targetLetter.origin.z;
      const dx = tx - this.group.position.x;
      const dz = tz - this.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < APPROACH_DIST) {
        this.beginShuffle(this.targetLetter, findNewSpot, onShuffled);
        return;
      }

      this.move(dx / dist, dz / dist, dt, SPEED);
      world.clampPosition(this.group.position);
      return;
    }
  }

  private async beginShuffle(
    letter: LetterPickup3D,
    findNewSpot: (letter: LetterPickup3D) => { x: number; z: number } | null,
    onShuffled: (letter: LetterPickup3D) => void,
  ): Promise<void> {
    if (this.shuffleBusy) return;
    this.shuffleBusy = true;
    this.state = 'shuffle';

    this.wiggleArms();

    const spot = findNewSpot(letter);
    if (spot) {
      await letter.relocateTo(spot.x, spot.z);
      onShuffled(letter);
    }

    this.shuffleBusy = false;
    this.targetLetter = null;
    this.state = 'idle';
    this.idleTimer = SHUFFLE_COOLDOWN;
  }

  private wiggleArms(): void {
    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 500;
      if (t < 1) {
        this.body.rotation.z = Math.sin(t * Math.PI * 6) * 0.15;
        requestAnimationFrame(animate);
      } else {
        this.body.rotation.z = 0;
      }
    };
    requestAnimationFrame(animate);
  }

  private move(dirX: number, dirZ: number, dt: number, speed: number): void {
    this.group.position.x += dirX * speed * dt;
    this.group.position.z += dirZ * speed * dt;
    this.targetRotation = Math.atan2(dirX, dirZ);
    const rotDiff = this.targetRotation - this.group.rotation.y;
    this.group.rotation.y += Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff)) * Math.min(1, 10 * dt);
    this.walkPhase += dt * 9;
    const bounce = Math.abs(Math.sin(this.walkPhase)) * 0.05;
    this.body.position.y = 1.05 + bounce;
    this.head.position.y = 1.65 + bounce;
  }

  private bobIdle(): void {
    const t = performance.now() * 0.002;
    this.body.position.y = 1.05 + Math.sin(t) * 0.03;
    this.head.position.y = 1.65 + Math.sin(t) * 0.03;
  }
}