import * as THREE from 'three';

const ISLAND_RADIUS = 18;
const MAP_BOUND = 16;

export default class World {
  readonly scene: THREE.Scene;
  readonly obstacles: THREE.Box3[] = [];
  private waterMesh!: THREE.Mesh;
  private treeCenters: { x: number; z: number }[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 70);

    this.setupLighting();
    this.buildIsland();
    this.buildDecorations();
    this.buildWater();
  }

  getBounds(): number {
    return MAP_BOUND;
  }

  /** Inner meadow where letters spawn — kept clear of trees */
  isLetterZone(x: number, z: number): boolean {
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 9.5) return false;
    if (this.isNearRack(x, z)) return false;
    for (const tree of this.treeCenters) {
      if (Math.hypot(x - tree.x, z - tree.z) < 4) return false;
    }
    return true;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d8b37, 0.45);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffaf0, 1.1);
    sun.position.set(12, 22, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    this.scene.add(sun);
  }

  private buildIsland(): void {
    const grassGeo = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 1, 0.6, 48);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x5cb85c });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.3;
    grass.receiveShadow = true;
    this.scene.add(grass);

    const dirtGeo = new THREE.BoxGeometry(14, 0.05, 3);
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0xc9a96e });
    const path = new THREE.Mesh(dirtGeo, dirtMat);
    path.position.set(0, 0.02, 0);
    path.receiveShadow = true;
    this.scene.add(path);

    const path2 = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.05, 22),
      dirtMat,
    );
    path2.position.set(0, 0.02, -4);
    path2.receiveShadow = true;
    this.scene.add(path2);

    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const x = Math.cos(angle) * (ISLAND_RADIUS - 0.5);
      const z = Math.sin(angle) * (ISLAND_RADIUS - 0.5);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), fenceMat);
      post.position.set(x, 0.6, z);
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  private buildDecorations(): void {
    // Trees on the outer ring only — well spaced, away from letter meadow
    const treeAngles = [0.55, 1.35, 2.1, 3.0, 3.85, 4.75, 5.55];
    const treeRadius = 14;
    treeAngles.forEach((angle) => {
      const x = Math.cos(angle) * treeRadius;
      const z = Math.sin(angle) * treeRadius;
      if (!this.isNearRack(x, z)) this.addTree(x, z);
    });

    const flowerColors = [0xff6b9d, 0xffd93d, 0xff8a65, 0xce93d8, 0x4fc3f7];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 6;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (!this.isLetterZone(x, z)) continue;
      if (Math.abs(x) < 1.5 && Math.abs(z - 3) < 2) continue;
      this.addFlower(x, z, flowerColors[i % flowerColors.length]);
    }
  }

  private isNearRack(x: number, z: number): boolean {
    return Math.abs(x) < 7 && z < -5 && z > -15;
  }

  private addTree(x: number, z: number): void {
    this.treeCenters.push({ x, z });

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 1.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x5c3d1e }),
    );
    trunk.position.set(x, 0.7, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 10, 8),
      new THREE.MeshLambertMaterial({
        color: 0x3aa862,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    foliage.position.set(x, 2.1, z);
    foliage.scale.set(1, 1.05, 1);
    foliage.renderOrder = 1;
    this.scene.add(foliage);

    const hitBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 1.0, z),
      new THREE.Vector3(1.4, 2.8, 1.4),
    );
    this.obstacles.push(hitBox);
  }

  private addFlower(x: number, z: number, color: number): void {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a9f3f }),
    );
    stem.position.set(x, 0.25, z);
    this.scene.add(stem);

    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshLambertMaterial({ color }),
    );
    bloom.position.set(x, 0.55, z);
    this.scene.add(bloom);
  }

  private buildWater(): void {
    const waterGeo = new THREE.CircleGeometry(40, 48);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x4aa3df, transparent: true, opacity: 0.75 });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -0.8;
    this.scene.add(this.waterMesh);
  }

  update(time: number): void {
    this.waterMesh.position.y = -0.8 + Math.sin(time * 0.8) * 0.05;
  }

  clampPosition(pos: THREE.Vector3): void {
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > MAP_BOUND) {
      const scale = MAP_BOUND / dist;
      pos.x *= scale;
      pos.z *= scale;
    }

    for (const box of this.obstacles) {
      if (box.containsPoint(pos)) {
        const center = box.getCenter(new THREE.Vector3());
        const away = pos.clone().sub(center);
        away.y = 0;
        if (away.length() < 0.01) away.set(1, 0, 0);
        away.normalize().multiplyScalar(2.5);
        pos.copy(center).add(away);
      }
    }
  }
}