import * as THREE from 'three';

export default class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private shakeAmount = 0;
  private shakeDecay = 0;
  private angle = 0;
  private distance = 14;
  private height = 10;
  private lookOffset = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.angle = Math.PI * 0.2;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, target: THREE.Vector3): void {
    const x = target.x + Math.sin(this.angle) * this.distance;
    const z = target.z + Math.cos(this.angle) * this.distance;
    const y = this.height;

    const desired = new THREE.Vector3(x, y, z);
    this.camera.position.lerp(desired, Math.min(1, 4 * dt));
    this.lookOffset.lerp(target.clone().add(new THREE.Vector3(0, 1.5, 0)), Math.min(1, 6 * dt));
    this.camera.lookAt(this.lookOffset);

    if (this.shakeAmount > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmount * 0.5;
      this.shakeAmount *= this.shakeDecay;
      if (this.shakeAmount < 0.01) this.shakeAmount = 0;
    }
  }

  shake(intensity = 0.4, decay = 0.85): void {
    this.shakeAmount = intensity;
    this.shakeDecay = decay;
  }

  punch(): void {
    this.distance = 11;
    setTimeout(() => { this.distance = 14; }, 200);
  }

  getAngle(): number {
    return this.angle;
  }
}