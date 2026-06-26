import * as THREE from 'three';
import World from './World';
import Player3D from './Player3D';
import LetterPickup3D, { createLetterTexture } from './LetterPickup3D';
import LetterRack3D from './LetterRack3D';
import CameraController from './CameraController';
import InputManager from './InputManager';
import RewardEffects3D from './RewardEffects3D';
import WordManager from '../systems/WordManager';
import SpeechManager from '../systems/SpeechManager';
import SoundManager from '../systems/SoundManager';
import TrayManager from '../systems/TrayManager';
import TrayUI from '../ui/TrayUI';
import ParticleEffects from '../ui/ParticleEffects';
import Adversary3D from './Adversary3D';

const PICKUP_RADIUS = 3;

export default class Game {
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private player: Player3D;
  private adversary: Adversary3D;
  private rack: LetterRack3D;
  private cameraCtrl: CameraController;
  private input: InputManager;
  private rewards3d: RewardEffects3D;
  private wordManager = new WordManager();
  private speech = new SpeechManager();
  private sfx = new SoundManager();
  private trayManager = new TrayManager();
  private trayUI: TrayUI;
  private particles = new ParticleEffects();
  private letters: LetterPickup3D[] = [];
  private carried: LetterPickup3D | null = null;
  private carriedMesh: THREE.Group | null = null;
  private currentWord = '';
  private wordsCompleted = 0;
  private celebrating = false;
  private actionLocked = false;
  private advancingWord = false;
  private actionUnlockTimer: ReturnType<typeof setTimeout> | null = null;
  private wordAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private wordAdvanceDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private clock = new THREE.Clock();
  private animId = 0;
  private running = false;

  constructor(container: HTMLElement) {
    this.world = new World();
    this.player = new Player3D();
    this.world.scene.add(this.player.group);
    this.player.group.position.set(0, 0, 6);

    this.adversary = new Adversary3D();
    this.world.scene.add(this.adversary.group);

    this.rack = new LetterRack3D(this.world.scene);
    this.rewards3d = new RewardEffects3D(this.world.scene);

    this.cameraCtrl = new CameraController(container.clientWidth / container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.prepend(this.renderer.domElement);

    this.input = new InputManager();
    this.trayUI = new TrayUI();

    window.addEventListener('resize', () => this.onResize(container));

    const repeatBtn = document.getElementById('repeat-btn');
    repeatBtn?.addEventListener('click', () => this.speech.announceWord(this.currentWord));
  }

  start(): void {
    this.running = true;
    document.getElementById('hud')?.classList.add('active');
    document.getElementById('mobile-controls')?.classList.add('game-active');
    this.speech.warmUp();
    this.startNewWord();
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animId);
    this.clearActionUnlock();
    this.clearWordAdvanceTimers();
    this.speech.stop();
    this.resetPlayState();
  }

  private loop(): void {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    if (!this.celebrating && !this.actionLocked) {
      const move = this.input.getMovement();

      this.player.update(dt, move.x, move.z, this.cameraCtrl.getAngle());
      this.world.clampPosition(this.player.getPosition());

      if (this.carried) {
        this.applyRackGuidance(dt);
      }

      if (this.input.consumeInteract()) {
        this.handleInteract();
      }

      this.updateHint();
    }

    this.input.endFrame();
    this.letters.forEach((l) => l.update(time));
    this.updateCarriedMesh(time);

    if (!this.celebrating) {
      this.adversary.update(
        dt,
        this.letters,
        this.player.getPosition(),
        this.world,
        (letter) => this.onLetterShuffled(letter),
        (letter) => this.findShuffleSpot(letter),
      );
    }

    this.world.update(time);
    this.cameraCtrl.update(dt, this.player.getPosition());
    this.renderer.render(this.world.scene, this.cameraCtrl.camera);
  }

  private handleInteract(): void {
    if (this.carried) {
      if (this.rack.isPlayerInRange(this.player.getPosition())) {
        this.tryThrow();
      } else {
        this.putDownLetter();
      }
    } else {
      this.tryPickup();
    }
  }

  private applyRackGuidance(dt: number): void {
    const slotIndex = this.trayManager.getNextSlotIndex();
    if (slotIndex < 0) return;

    const pos = this.player.getPosition();
    if (!this.rack.isInGuidanceZone(pos, slotIndex)) return;

    const strength = this.rack.getGuidanceStrength(pos, slotIndex);
    if (strength < 0.02) return;

    this.player.applyRackSteering(
      this.rack.getApproachTarget(slotIndex),
      this.rack.getThrowTarget(slotIndex),
      dt,
      strength,
    );
    this.world.clampPosition(this.player.getPosition());
  }

  private putDownLetter(): void {
    if (!this.carried || this.actionLocked) return;

    const letter = this.carried;
    this.carried = null;
    this.player.setCarrying(false);

    if (this.carriedMesh) {
      this.player.getCarryAnchor().remove(this.carriedMesh);
      this.carriedMesh = null;
    }

    letter.returnToOrigin();
    this.sfx.playPutDown();
  }

  private startNewWord(): void {
    this.resetPlayState();
    this.clearLetters();
    const entry = this.wordManager.getNextWord();
    this.currentWord = entry.word;
    this.trayManager.setup(this.currentWord);
    this.rack.setup(this.trayManager.getSlotCount());
    this.syncRackHighlight();
    this.trayUI.setup(this.trayManager);
    this.trayUI.setProgress(`Words completed: ${this.wordsCompleted}`);
    this.spawnLetters();
    this.adversary.reset();
    this.speech.announceWord(this.currentWord);
  }

  private onLetterShuffled(letter: LetterPickup3D): void {
    this.sfx.playMischief();
    this.trayUI.setHint(`Scrambler moved the "${letter.letter}" tile!`);
    this.particles.showFloatingText('Scrambled!', '#9b59b6');
  }

  private findShuffleSpot(letter: LetterPickup3D): { x: number; z: number } | null {
    const rackPos = this.rack.getRackPosition();
    const playerPos = this.player.getPosition();

    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 6;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      if (!this.world.isLetterZone(x, z)) continue;
      if (Math.hypot(x - letter.origin.x, z - letter.origin.z) < 3) continue;
      if (playerPos.distanceTo(new THREE.Vector3(x, 0, z)) < 2.5) continue;
      if (Math.hypot(x - rackPos.x, z - rackPos.z) < 4) continue;

      const blocked = this.letters.some((l) => {
        if (l === letter || l.pickedUp) return false;
        return Math.hypot(l.origin.x - x, l.origin.z - z) < 2.2;
      });
      if (blocked) continue;

      return { x, z };
    }
    return null;
  }

  private spawnLetters(): void {
    const allLetters = this.wordManager.getAllMapLetters(this.currentWord);
    const positions = this.getSpawnPositions(allLetters.length);

    allLetters.forEach((letter, i) => {
      const pos = positions[i];
      const pickup = new LetterPickup3D(letter, pos.x, pos.z);
      this.world.scene.add(pickup.mesh);
      this.letters.push(pickup);
    });
  }

  private getSpawnPositions(count: number): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    const rackPos = this.rack.getRackPosition();

    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 80 && !placed; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 3 + Math.random() * 6.5;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (!this.world.isLetterZone(x, z)) continue;

        const tooClose = positions.some((p) => {
          const dx = p.x - x;
          const dz = p.z - z;
          return Math.sqrt(dx * dx + dz * dz) < 2.5;
        });
        const nearPlayer = this.player.getPosition().distanceTo(new THREE.Vector3(x, 0, z)) < 3;
        const nearRack = Math.sqrt((x - rackPos.x) ** 2 + (z - rackPos.z) ** 2) < 4;

        if (!tooClose && !nearPlayer && !nearRack) {
          positions.push({ x, z });
          placed = true;
        }
      }
      if (!placed) {
        const angle = (i / count) * Math.PI * 2;
        positions.push({ x: Math.cos(angle) * 5, z: Math.sin(angle) * 4 + 2 });
      }
    }
    return positions;
  }

  private clearLetters(): void {
    this.letters.forEach((l) => this.world.scene.remove(l.mesh));
    this.letters = [];
    this.detachCarried();
  }

  private detachCarried(): void {
    this.carried = null;
    this.player.setCarrying(false);
    if (this.carriedMesh) {
      this.player.getCarryAnchor().remove(this.carriedMesh);
      this.carriedMesh = null;
    }
  }

  private tryPickup(): void {
    if (this.carried || this.actionLocked) return;
    const pos = this.player.getPosition();
    let closest: LetterPickup3D | null = null;
    let closestDist = PICKUP_RADIUS;

    for (const letter of this.letters) {
      if (letter.pickedUp) continue;
      const dist = letter.distanceTo(pos);
      if (dist < closestDist) {
        closestDist = dist;
        closest = letter;
      }
    }

    if (closest) {
      this.carried = closest;
      closest.pickUp();
      this.sfx.playPickup();
      this.createCarriedMesh(closest.letter);
      this.player.setCarrying(true);
    }
  }

  private createCarriedMesh(letter: string): void {
    if (this.carriedMesh) {
      this.player.getCarryAnchor().remove(this.carriedMesh);
    }
    this.carriedMesh = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.2, 0.85),
      new THREE.MeshLambertMaterial({ color: 0xc4a66a }),
    );
    base.position.y = 0.1;
    this.carriedMesh.add(base);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: createLetterTexture(letter), transparent: true }),
    );
    sprite.scale.set(1.0, 1.0, 1);
    sprite.position.y = 0.65;
    this.carriedMesh.add(sprite);

    this.player.getCarryAnchor().add(this.carriedMesh);
  }

  private updateCarriedMesh(time: number): void {
    if (!this.carriedMesh || this.actionLocked) return;
    this.carriedMesh.rotation.y = Math.sin(time * 2) * 0.1;
  }

  private tryThrow(): void {
    if (!this.carried || this.celebrating || this.actionLocked) return;
    if (!this.rack.isPlayerInRange(this.player.getPosition())) return;

    const slotIndex = this.trayManager.getNextSlotIndex();
    if (slotIndex < 0) return;

    this.actionLocked = true;
    this.scheduleActionUnlock(4000);
    this.player.faceToward(this.rack.getThrowTarget(slotIndex));

    const letter = this.carried.letter;
    const carriedRef = this.carried;
    const mesh = this.carriedMesh!;

    this.player.playThrowAnimation(
      () => {
        const worldStart = new THREE.Vector3();
        mesh.getWorldPosition(worldStart);
        this.player.getCarryAnchor().remove(mesh);
        this.world.scene.add(mesh);
        mesh.position.copy(worldStart);

        const target = this.rack.getThrowTarget(slotIndex);
        this.animateThrow(mesh, worldStart, target, () => {
          this.world.scene.remove(mesh);
          this.resolveThrow(letter, slotIndex, carriedRef);
        });
      },
      () => {},
    );
  }

  private animateThrow(
    mesh: THREE.Group,
    start: THREE.Vector3,
    end: THREE.Vector3,
    onComplete: () => void,
  ): void {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 3.5;
    const begin = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - begin) / 450, 1);
      const u = 1 - t;
      mesh.position.set(
        u * u * start.x + 2 * u * t * mid.x + t * t * end.x,
        u * u * start.y + 2 * u * t * mid.y + t * t * end.y,
        u * u * start.z + 2 * u * t * mid.z + t * t * end.z,
      );
      mesh.rotation.x += 0.15;
      mesh.rotation.z += 0.1;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(step);
  }

  private resolveThrow(letter: string, slotIndex: number, carriedRef: LetterPickup3D): void {
    const result = this.trayManager.validate(letter, slotIndex);

    if (result === 'locked') {
      this.clearActionUnlock();
      this.actionLocked = false;
      return;
    }

    if (result === 'correct') {
      this.carried = null;
      this.carriedMesh = null;
      this.player.setCarrying(false);

      const landPos = this.rack.placeLetter(slotIndex, letter);
      this.rack.pulseCorrect(slotIndex);
      this.trayUI.showCorrect(slotIndex, letter);

      this.sfx.playTrumpet();
      this.sfx.playCorrect();
      this.sfx.playSlotLock();
      this.sfx.playAwesome();
      this.speech.sayLetter(letter);
      this.player.miniCelebrate();
      this.cameraCtrl.punch();
      this.rewards3d.burstAt(landPos);
      this.particles.showFloatingText('AWESOME!', '#ffd700');
      this.particles.megaBurst();
      this.particles.goldFlash();

      this.syncRackHighlight();

      if (this.trayManager.isComplete()) {
        this.onWordComplete();
      }
    } else if (result === 'wrong') {
      this.cameraCtrl.shake();
      this.sfx.playWrong();
      this.speech.sayOops();
      this.rack.flashWrong(slotIndex);
      this.trayUI.showWrong(slotIndex);

      this.carried = null;
      this.carriedMesh = null;
      this.player.setCarrying(false);
      carriedRef.returnToOrigin();
    }

    this.clearActionUnlock();
    this.actionLocked = false;
  }

  private updateHint(): void {
    const pos = this.player.getPosition();

    if (this.carried) {
      this.setActionButtonLabel(
        this.rack.isPlayerInRange(pos) ? 'Throw' : 'Put Down',
      );
      if (this.rack.isPlayerInRange(pos)) {
        this.trayUI.setHint('Press Space or tap Throw — right letter sticks!');
      } else {
        this.trayUI.setHint('Wrong letter? Press Space to put it down. Or walk north to the Letter Rack.');
      }
      return;
    }

    this.setActionButtonLabel('Pick Up');

    for (const l of this.letters) {
      if (!l.pickedUp && l.distanceTo(pos) < PICKUP_RADIUS) {
        this.trayUI.setHint(`Tap the orange button to pick up "${l.letter}"`);
        return;
      }
    }

    this.trayUI.setHint('Find letters on the island, then bring them to the Letter Rack');
  }

  private onWordComplete(): void {
    this.clearWordAdvanceTimers();
    this.celebrating = true;
    this.wordsCompleted++;
    this.sfx.playVictory();
    this.player.celebrate();
    this.particles.confetti();
    this.particles.megaBurst();
    this.particles.goldFlash();
    this.particles.showFloatingText('GREAT JOB!', '#4caf50');
    this.trayUI.setProgress(`Words completed: ${this.wordsCompleted}`);

    this.speech.sayGreatJob(() => {
      this.wordAdvanceDelayTimer = setTimeout(() => this.advanceToNextWord(), 1200);
    });

    this.wordAdvanceTimer = setTimeout(() => this.advanceToNextWord(), 5000);
  }

  private advanceToNextWord(): void {
    if (this.advancingWord) return;
    this.advancingWord = true;
    this.clearWordAdvanceTimers();
    this.speech.stop();
    this.startNewWord();
    this.advancingWord = false;
  }

  private clearWordAdvanceTimers(): void {
    if (this.wordAdvanceTimer) clearTimeout(this.wordAdvanceTimer);
    if (this.wordAdvanceDelayTimer) clearTimeout(this.wordAdvanceDelayTimer);
    this.wordAdvanceTimer = null;
    this.wordAdvanceDelayTimer = null;
  }

  private resetPlayState(): void {
    this.celebrating = false;
    this.actionLocked = false;
    this.clearActionUnlock();
    this.player.resetAnimState();
  }

  private scheduleActionUnlock(ms: number): void {
    this.clearActionUnlock();
    this.actionUnlockTimer = setTimeout(() => {
      this.actionLocked = false;
      this.player.resetAnimState();
    }, ms);
  }

  private clearActionUnlock(): void {
    if (this.actionUnlockTimer) {
      clearTimeout(this.actionUnlockTimer);
      this.actionUnlockTimer = null;
    }
  }

  private setActionButtonLabel(label: string): void {
    const btn = document.getElementById('action-btn');
    if (btn) btn.innerHTML = label.replace(' ', '<br>');
  }

  private syncRackHighlight(): void {
    this.rack.setNextSlot(this.trayManager.getNextSlotIndex());
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.cameraCtrl.setAspect(w / h);
    this.renderer.setSize(w, h);
  }
}