import * as THREE from 'three';

export default class RewardEffects3D {
  constructor(private scene: THREE.Scene) {}

  burstAt(position: THREE.Vector3): void {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          2 + Math.random() * 6,
          (Math.random() - 0.5) * 8,
        ),
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.35,
      transparent: true,
      opacity: 1,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 900;
      if (t >= 1) {
        this.scene.remove(points);
        geo.dispose();
        mat.dispose();
        return;
      }
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        pos.setX(i, pos.getX(i) + velocities[i].x * 0.016);
        pos.setY(i, pos.getY(i) + velocities[i].y * 0.016 - t * 0.08);
        pos.setZ(i, pos.getZ(i) + velocities[i].z * 0.016);
        velocities[i].y -= 0.12;
      }
      pos.needsUpdate = true;
      mat.opacity = 1 - t;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    this.spawnRing(position);
  }

  private spawnRing(position: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.5, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffee58,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    ring.position.copy(position);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    const start = performance.now();
    const animate = (now: number) => {
      const t = (now - start) / 600;
      if (t >= 1) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
        return;
      }
      const s = 1 + t * 4;
      ring.scale.set(s, s, s);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}