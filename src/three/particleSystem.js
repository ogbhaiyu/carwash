import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bubbles = [];
    this.waterParticles = [];
    this.sparkles = [];
    this.honkWaves = [];

    // Shared Materials
    this.bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.2
    });

    this.waterMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.75
    });

    this.sparkleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 1.0
    });
  }

  // 1. Foam Cannon Blast
  emitFoam(sourcePos, targetPos, count = 12) {
    for (let i = 0; i < count; i++) {
      const radius = 0.08 + Math.random() * 0.18;
      const geo = new THREE.SphereGeometry(radius, 8, 8);
      const bubble = new THREE.Mesh(geo, this.bubbleMaterial);

      bubble.position.copy(sourcePos);
      bubble.position.x += (Math.random() - 0.5) * 0.2;
      bubble.position.y += (Math.random() - 0.5) * 0.2;
      bubble.position.z += (Math.random() - 0.5) * 0.2;

      // Velocity towards car target with spread
      const dir = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
      dir.x += (Math.random() - 0.5) * 0.4;
      dir.y += (Math.random() - 0.5) * 0.3;
      dir.z += (Math.random() - 0.5) * 0.4;

      const speed = 4 + Math.random() * 3.5;
      bubble.userData = {
        velocity: dir.multiplyScalar(speed),
        life: 0,
        maxLife: 3.5 + Math.random() * 2,
        wobbleSpeed: 4 + Math.random() * 6,
        isStuck: false
      };

      this.scene.add(bubble);
      this.bubbles.push(bubble);
    }
  }

  // 2. High Pressure Water Spray
  emitWaterJet(sourcePos, targetPos, count = 20) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.04, 0.04, 0.16);
      const droplet = new THREE.Mesh(geo, this.waterMaterial);

      droplet.position.copy(sourcePos);
      const dir = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
      dir.x += (Math.random() - 0.5) * 0.2;
      dir.y += (Math.random() - 0.5) * 0.2;
      dir.z += (Math.random() - 0.5) * 0.2;

      const speed = 9 + Math.random() * 4;
      droplet.userData = {
        velocity: dir.multiplyScalar(speed),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3
      };
      droplet.lookAt(targetPos);

      this.scene.add(droplet);
      this.waterParticles.push(droplet);
    }
  }

  // 3. Victory Sparkles on Clean Car
  emitSparkles(centerPos, count = 10) {
    for (let i = 0; i < count; i++) {
      const size = 0.12 + Math.random() * 0.2;
      const geo = new THREE.OctahedronGeometry(size);
      const sparkle = new THREE.Mesh(geo, this.sparkleMaterial.clone());

      sparkle.position.copy(centerPos);
      sparkle.position.x += (Math.random() - 0.5) * 2.2;
      sparkle.position.y += Math.random() * 1.5;
      sparkle.position.z += (Math.random() - 0.5) * 3.8;

      sparkle.userData = {
        life: 0,
        maxLife: 1.2 + Math.random() * 1.0,
        rotSpeed: 5 + Math.random() * 5,
        scaleSpeed: 2 + Math.random() * 2
      };

      this.scene.add(sparkle);
      this.sparkles.push(sparkle);
    }
  }

  // 4. Honk Sound Wave Ring
  emitHonkWave(carPos) {
    const ringGeo = new THREE.RingGeometry(0.5, 0.65, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    wave.position.set(carPos.x, carPos.y + 0.8, carPos.z + 1.2);
    wave.userData = { life: 0, maxLife: 0.7 };

    this.scene.add(wave);
    this.honkWaves.push(wave);
  }

  // Clear all bubbles and particles
  clearAll() {
    this.bubbles.forEach(b => this.scene.remove(b));
    this.waterParticles.forEach(w => this.scene.remove(w));
    this.sparkles.forEach(s => this.scene.remove(s));
    this.honkWaves.forEach(h => this.scene.remove(h));
    this.bubbles = [];
    this.waterParticles = [];
    this.sparkles = [];
    this.honkWaves = [];
  }

  update(delta) {
    // 1. Update Bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.userData.life += delta;

      if (b.userData.life >= b.userData.maxLife) {
        this.scene.remove(b);
        this.bubbles.splice(i, 1);
        continue;
      }

      if (!b.userData.isStuck) {
        b.position.addScaledVector(b.userData.velocity, delta);
        // If hits ground or car vicinity, slow down & stick
        if (b.position.y < 0.2 || (Math.abs(b.position.x) < 1.4 && Math.abs(b.position.z) < 2.5 && b.position.y < 1.6)) {
          b.userData.isStuck = true;
          b.userData.velocity.set(0, 0, 0);
        }
      } else {
        // Slow gentle slide down
        b.position.y -= delta * 0.08;
      }

      // Bubble wobble animation
      const scale = 1 + Math.sin(b.userData.life * b.userData.wobbleSpeed) * 0.12;
      b.scale.set(scale, scale, scale);
    }

    // 2. Update Water Droplets
    for (let i = this.waterParticles.length - 1; i >= 0; i--) {
      const w = this.waterParticles[i];
      w.userData.life += delta;

      if (w.userData.life >= w.userData.maxLife) {
        this.scene.remove(w);
        this.waterParticles.splice(i, 1);
        continue;
      }

      w.position.addScaledVector(w.userData.velocity, delta);
      w.userData.velocity.y -= 9.8 * delta; // Gravity drop
    }

    // 3. Update Sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.userData.life += delta;

      if (s.userData.life >= s.userData.maxLife) {
        this.scene.remove(s);
        this.sparkles.splice(i, 1);
        continue;
      }

      s.rotation.x += delta * s.userData.rotSpeed;
      s.rotation.y += delta * s.userData.rotSpeed;
      const progress = s.userData.life / s.userData.maxLife;
      // Pulse scale
      const sScale = Math.sin(progress * Math.PI) * 1.5;
      s.scale.set(sScale, sScale, sScale);
      s.material.opacity = 1 - progress;
    }

    // 4. Update Honk Waves
    for (let i = this.honkWaves.length - 1; i >= 0; i--) {
      const h = this.honkWaves[i];
      h.userData.life += delta;

      if (h.userData.life >= h.userData.maxLife) {
        this.scene.remove(h);
        this.honkWaves.splice(i, 1);
        continue;
      }

      const progress = h.userData.life / h.userData.maxLife;
      const ringScale = 1 + progress * 3.5;
      h.scale.set(ringScale, ringScale, 1);
      h.material.opacity = 1 - progress;
    }
  }
}
