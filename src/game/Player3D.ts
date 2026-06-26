import * as THREE from 'three';

const SPEED = 6;
const ROTATION_SPEED = 10;

export default class Player3D {
  readonly group: THREE.Group;
  private body!: THREE.Mesh;
  private head!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private walkPhase = 0;
  private targetRotation = 0;
  private celebrating = false;
  private carrying = false;
  private throwing = false;
  private carryAnchor = new THREE.Group();

  constructor() {
    this.group = new THREE.Group();
    this.buildCharacter();
    this.group.add(this.carryAnchor);
    this.carryAnchor.position.set(0, 2.9, 0.15);
  }

  getCarryAnchor(): THREE.Group {
    return this.carryAnchor;
  }

  private buildCharacter(): void {
    const skin = new THREE.MeshLambertMaterial({ color: 0xf4a582 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x4a90d9 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2d5a3d });
    const hair = new THREE.MeshLambertMaterial({ color: 0x5b3a1a });
    const shoe = new THREE.MeshLambertMaterial({ color: 0x5b3a1a });

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), shirt);
    this.body.position.y = 1.1;
    this.body.castShadow = true;
    this.group.add(this.body);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), skin);
    this.head.position.y = 1.75;
    this.head.castShadow = true;
    this.group.add(this.head);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
    );
    hairCap.position.y = 1.82;
    this.group.add(hairCap);

    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.78, 0.32);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.78, 0.32);
    this.group.add(leftEye, rightEye);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0xff8a9b }),
    );
    cheek.position.set(0, 1.68, 0.34);
    cheek.scale.set(1.4, 0.7, 0.5);
    this.group.add(cheek);

    const legGeo = new THREE.BoxGeometry(0.25, 0.55, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, pants);
    leftLeg.position.set(-0.18, 0.5, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, pants);
    rightLeg.position.set(0.18, 0.5, 0);
    rightLeg.castShadow = true;
    this.group.add(leftLeg, rightLeg);

    const footGeo = new THREE.BoxGeometry(0.28, 0.12, 0.38);
    const leftFoot = new THREE.Mesh(footGeo, shoe);
    leftFoot.position.set(-0.18, 0.18, 0.05);
    const rightFoot = new THREE.Mesh(footGeo, shoe);
    rightFoot.position.set(0.18, 0.18, 0.05);
    this.group.add(leftFoot, rightFoot);

    const armGeo = new THREE.BoxGeometry(0.2, 0.55, 0.22);
    this.leftArm = new THREE.Mesh(armGeo, skin);
    this.leftArm.position.set(-0.5, 1.15, 0);
    this.rightArm = new THREE.Mesh(armGeo, skin);
    this.rightArm.position.set(0.5, 1.15, 0);
    this.group.add(this.leftArm, this.rightArm);
  }

  setCarrying(carried: boolean): void {
    this.carrying = carried;
    if (carried) {
      this.leftArm.rotation.x = -2.2;
      this.leftArm.position.y = 1.55;
      this.leftArm.position.z = 0.15;
      this.rightArm.rotation.x = -2.2;
      this.rightArm.position.y = 1.55;
      this.rightArm.position.z = 0.15;
    } else {
      this.leftArm.rotation.x = 0;
      this.leftArm.position.set(-0.5, 1.15, 0);
      this.rightArm.rotation.x = 0;
      this.rightArm.position.set(0.5, 1.15, 0);
    }
  }

  setThrowing(throwing: boolean): void {
    this.throwing = throwing;
  }

  isThrowing(): boolean {
    return this.throwing;
  }

  playThrowAnimation(onMid: () => void, onEnd: () => void): void {
    this.throwing = true;
    const start = performance.now();

    const animate = (now: number) => {
      const t = (now - start) / 500;
      if (t < 0.35) {
        this.rightArm.rotation.x = -2.2 - t * 3;
        this.leftArm.rotation.x = -2.2 - t * 3;
        requestAnimationFrame(animate);
      } else if (t < 0.4) {
        onMid();
        requestAnimationFrame(animate);
      } else if (t < 1) {
        const ease = (t - 0.4) / 0.6;
        this.rightArm.rotation.x = -2.2 + ease * 2.2;
        this.leftArm.rotation.x = -2.2 + ease * 2.2;
        requestAnimationFrame(animate);
      } else {
        this.throwing = false;
        if (this.carrying) {
          this.setCarrying(true);
        } else {
          this.setCarrying(false);
        }
        onEnd();
      }
    };
    requestAnimationFrame(animate);
  }

  update(dt: number, moveX: number, moveZ: number, cameraAngle: number): boolean {
    if (this.celebrating || this.throwing) return false;

    const moving = moveX !== 0 || moveZ !== 0;
    if (moving) {
      const camForward = new THREE.Vector3(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
      const camRight = new THREE.Vector3(Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));

      const direction = new THREE.Vector3()
        .addScaledVector(camRight, moveX)
        .addScaledVector(camForward, -moveZ);

      if (direction.length() > 0.01) {
        direction.normalize();
        this.group.position.x += direction.x * SPEED * dt;
        this.group.position.z += direction.z * SPEED * dt;
        this.targetRotation = Math.atan2(direction.x, direction.z);
      }

      this.walkPhase += dt * 10;
      const bounce = Math.abs(Math.sin(this.walkPhase)) * 0.06;
      this.body.position.y = 1.1 + bounce;
      this.head.position.y = 1.75 + bounce;
      if (this.carrying) {
        this.carryAnchor.position.y = 2.9 + bounce + Math.sin(this.walkPhase * 2) * 0.04;
      }
    } else {
      this.body.position.y = 1.1;
      this.head.position.y = 1.75;
      if (this.carrying) {
        this.carryAnchor.position.y = 2.9 + Math.sin(performance.now() * 0.004) * 0.05;
      }
    }

    const rotDiff = this.targetRotation - this.group.rotation.y;
    const shortest = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff));
    this.group.rotation.y += shortest * Math.min(1, ROTATION_SPEED * dt);

    return moving;
  }

  faceToward(target: THREE.Vector3): void {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    this.targetRotation = Math.atan2(dx, dz);
    this.group.rotation.y = this.targetRotation;
  }

  applyRackSteering(
    approachTarget: THREE.Vector3,
    faceTarget: THREE.Vector3,
    dt: number,
    strength: number,
    arrivalRadius: number,
  ): void {
    if (this.celebrating || this.throwing || strength <= 0) return;

    const pos = this.group.position;
    const toTarget = approachTarget.clone().sub(pos);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist > arrivalRadius) {
      toTarget.normalize();
      const urgency = dist < 3 ? 1 + (1 - dist / 3) * 1.2 : 1;
      const steerSpeed = SPEED * strength * 0.8 * urgency;
      pos.x += toTarget.x * steerSpeed * dt;
      pos.z += toTarget.z * steerSpeed * dt;
    }

    const dx = faceTarget.x - pos.x;
    const dz = faceTarget.z - pos.z;
    const faceRot = Math.atan2(dx, dz);
    const rotDiff = faceRot - this.targetRotation;
    const shortest = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff));
    this.targetRotation += shortest * Math.min(1, strength * 3.5 * dt);

    const rotApply = this.targetRotation - this.group.rotation.y;
    const rotShort = Math.atan2(Math.sin(rotApply), Math.cos(rotApply));
    this.group.rotation.y += rotShort * Math.min(1, ROTATION_SPEED * dt);
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  miniCelebrate(): void {
    const startY = this.group.position.y;
    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 250;
      if (t < 1) {
        this.group.position.y = startY + Math.sin(t * Math.PI) * 0.5;
        requestAnimationFrame(animate);
      } else {
        this.group.position.y = startY;
      }
    };
    requestAnimationFrame(animate);
  }

  resetAnimState(): void {
    this.celebrating = false;
    this.throwing = false;
    this.body.position.y = 1.1;
    this.head.position.y = 1.75;
    this.group.position.y = 0;
    this.leftArm.rotation.x = 0;
    this.leftArm.position.set(-0.5, 1.15, 0);
    this.rightArm.rotation.x = 0;
    this.rightArm.position.set(0.5, 1.15, 0);
  }

  celebrate(): void {
    this.celebrating = true;
    let jumps = 0;
    const jump = () => {
      if (jumps >= 4) {
        this.celebrating = false;
        return;
      }
      jumps++;
      const startY = this.group.position.y;
      const start = performance.now();
      const animate = (now: number) => {
        const t = (now - start) / 300;
        if (t < 1) {
          this.group.position.y = startY + Math.sin(t * Math.PI) * 0.8;
          requestAnimationFrame(animate);
        } else {
          this.group.position.y = startY;
          setTimeout(jump, 100);
        }
      };
      requestAnimationFrame(animate);
    };
    jump();
  }
}