import * as THREE from 'three';

export class CarFactory {
  constructor() {
    // Shared materials
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x112233,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85
    });

    this.tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    });

    this.rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.3
    });

    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });

    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1111,
      emissive: 0xff0000,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    this.dirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });
  }

  createWheel(radius = 0.42, width = 0.32) {
    const wheelGroup = new THREE.Group();
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, this.tireMaterial);
    tire.castShadow = true;

    const rimGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width * 1.05, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, this.rimMaterial);

    wheelGroup.add(tire);
    wheelGroup.add(rim);
    return wheelGroup;
  }

  createVoxelBox(w, h, d, color, metalness = 0.2, roughness = 0.5) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Create Dirt Overlay Clumps - exclusively on car body exterior surfaces, NEVER below chassis or on the ground
  createDirtClumps(parentMesh, count = 28, width = 2.0, height = 0.8, length = 4.4, bottomY = 0.42) {
    const dirtGroup = new THREE.Group();
    dirtGroup.name = 'dirtLayer';
    dirtGroup.userData.isDirt = true;

    const halfW = width / 2;
    const halfL = length / 2;
    const topY = bottomY + height;

    for (let i = 0; i < count; i++) {
      const surfaceType = Math.random();
      let dirtMesh;

      if (surfaceType < 0.45) {
        // 1. SIDE PANELS (Doors, fenders, quarter panels) - thin mud splatters
        const sX = 0.02;
        const sY = 0.08 + Math.random() * 0.16;
        const sZ = 0.12 + Math.random() * 0.28;
        const geo = new THREE.BoxGeometry(sX, sY, sZ);
        dirtMesh = new THREE.Mesh(geo, this.dirtMaterial.clone());

        const side = Math.random() > 0.5 ? 1 : -1;
        const posX = side * (halfW + 0.01);
        const posY = bottomY + 0.06 + Math.random() * (height * 0.75);
        const posZ = (Math.random() - 0.5) * (length * 0.85);
        dirtMesh.position.set(posX, posY, posZ);

      } else if (surfaceType < 0.75) {
        // 2. TOP SURFACES (Hood, windshield base, roof, trunk)
        const sX = 0.12 + Math.random() * 0.28;
        const sY = 0.02;
        const sZ = 0.12 + Math.random() * 0.28;
        const geo = new THREE.BoxGeometry(sX, sY, sZ);
        dirtMesh = new THREE.Mesh(geo, this.dirtMaterial.clone());

        const posX = (Math.random() - 0.5) * (width * 0.75);
        const isRoof = Math.random() > 0.55;
        const posY = isRoof ? topY + 0.01 : (bottomY + height * 0.55 + 0.01);
        const posZ = isRoof ? (Math.random() - 0.5) * (length * 0.4) : (0.2 + Math.random() * 0.6) * halfL;
        dirtMesh.position.set(posX, posY, posZ);

      } else if (surfaceType < 0.90) {
        // 3. FRONT BUMPER & NOSE (Bugs & road spray)
        const sX = 0.10 + Math.random() * 0.22;
        const sY = 0.06 + Math.random() * 0.14;
        const sZ = 0.02;
        const geo = new THREE.BoxGeometry(sX, sY, sZ);
        dirtMesh = new THREE.Mesh(geo, this.dirtMaterial.clone());

        const posX = (Math.random() - 0.5) * (width * 0.75);
        const posY = bottomY + 0.06 + Math.random() * (height * 0.6);
        const posZ = halfL + 0.01;
        dirtMesh.position.set(posX, posY, posZ);

      } else {
        // 4. REAR FASCIA & EXHAUST GRIME
        const sX = 0.12 + Math.random() * 0.24;
        const sY = 0.06 + Math.random() * 0.14;
        const sZ = 0.02;
        const geo = new THREE.BoxGeometry(sX, sY, sZ);
        dirtMesh = new THREE.Mesh(geo, this.dirtMaterial.clone());

        const posX = (Math.random() - 0.5) * (width * 0.75);
        const posY = bottomY + 0.06 + Math.random() * (height * 0.55);
        const posZ = -halfL - 0.01;
        dirtMesh.position.set(posX, posY, posZ);
      }

      dirtMesh.userData.isDirt = true;
      dirtMesh.castShadow = true;
      dirtGroup.add(dirtMesh);
    }
    parentMesh.add(dirtGroup);
    return dirtGroup;
  }

  createLicensePlate(text, bg = 0xffffff, fg = 0x000000) {
    const group = new THREE.Group();
    const plateMesh = this.createVoxelBox(0.85, 0.3, 0.05, bg, 0.1, 0.8);
    group.add(plateMesh);

    // Canvas texture for license plate text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + bg.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 90);

    ctx.fillStyle = '#888888';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CALIFORNIA', 128, 24);

    ctx.fillStyle = '#' + fg.toString(16).padStart(6, '0');
    ctx.font = '900 48px sans-serif';
    ctx.fillText(text, 128, 72);

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const textGeo = new THREE.PlaneGeometry(0.82, 0.28);
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.z = 0.03;
    group.add(textMesh);

    return group;
  }

  // 1. THE VC'S TESLA MODEL Y
  buildTeslaModelY() {
    const car = new THREE.Group();
    car.userData = {
      name: "The VC's Muddy Tesla Model Y",
      plate: "AI-CHAD",
      desc: "Parked diagonally outside Sand Hill Road. Covered in Napa Valley mud and spilled oat latte.",
      hornSound: "beep",
      primaryColor: 0x0066cc
    };

    // Lower Chassis
    const lowerBody = this.createVoxelBox(1.9, 0.65, 4.4, 0x0066cc, 0.4, 0.3);
    lowerBody.position.y = 0.72;
    car.add(lowerBody);

    // Cabin / Curved Glass Canopy
    const cabin = this.createVoxelBox(1.7, 0.7, 2.4, 0x111c24, 0.2, 0.2);
    cabin.material = this.glassMaterial;
    cabin.position.set(0, 1.35, -0.2);
    car.add(cabin);

    // Roof beam
    const roof = this.createVoxelBox(1.72, 0.08, 2.42, 0x0066cc, 0.4, 0.3);
    roof.position.set(0, 1.72, -0.2);
    car.add(roof);

    // Front Frunk Nose
    const nose = this.createVoxelBox(1.85, 0.4, 0.8, 0x0066cc, 0.4, 0.3);
    nose.position.set(0, 0.65, 2.3);
    car.add(nose);

    // Headlights (LED strips)
    const hlLeft = this.createVoxelBox(0.4, 0.12, 0.1, 0xffffff);
    hlLeft.material = this.headlightMaterial;
    hlLeft.position.set(-0.72, 0.72, 2.7);
    car.add(hlLeft);

    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.72;
    car.add(hlRight);

    // Taillight bar
    const tailBar = this.createVoxelBox(1.6, 0.1, 0.1, 0xff0000);
    tailBar.material = this.taillightMaterial;
    tailBar.position.set(0, 0.85, -2.22);
    car.add(tailBar);

    // Wheels (radius = 0.44, ground contact at y = 0)
    const wheels = [
      { x: -0.98, y: 0.44, z: 1.4 },
      { x: 0.98, y: 0.44, z: 1.4 },
      { x: -0.98, y: 0.44, z: -1.35 },
      { x: 0.98, y: 0.44, z: -1.35 }
    ];
    car.userData.wheels = [];
    wheels.forEach(pos => {
      const wheel = this.createWheel(0.44, 0.32);
      wheel.position.set(pos.x, pos.y, pos.z);
      car.add(wheel);
      car.userData.wheels.push(wheel);
    });

    // License Plate
    const plate = this.createLicensePlate('AI-CHAD');
    plate.position.set(0, 0.5, -2.23);
    plate.rotation.y = Math.PI;
    car.add(plate);

    // Dirt Layer on panels (strictly exterior, bottomY = 0.40)
    this.createDirtClumps(car, 30, 1.9, 0.9, 4.4, 0.40);
    return car;
  }

  // 2. THE PALO ALTO CYBERTRUCK
  buildCyberTruck() {
    const car = new THREE.Group();
    car.userData = {
      name: "The Palo Alto CyberTruck",
      plate: "DISRUPT",
      desc: "Smudged with tech founder fingerprints and Lake Tahoe pine dust. 100% cold-rolled stainless steel.",
      hornSound: "truck",
      primaryColor: 0x999999
    };

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.35
    });

    // Lower Wedge Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 4.8), steelMat);
    lowerBody.position.y = 0.9;
    lowerBody.castShadow = true;
    car.add(lowerBody);

    // Angular Pyramid Cabin
    const cabinGeo = new THREE.BoxGeometry(1.85, 0.85, 2.6);
    const cabin = new THREE.Mesh(cabinGeo, this.glassMaterial);
    cabin.position.set(0, 1.7, -0.2);
    car.add(cabin);

    // Peak Roof Peak Line
    const peak = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 0.6), steelMat);
    peak.position.set(0, 2.15, -0.2);
    car.add(peak);

    // Sloped Bed Cover
    const bedCover = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.15, 1.5), steelMat);
    bedCover.position.set(0, 1.45, -1.8);
    bedCover.rotation.x = 0.25;
    car.add(bedCover);

    // Front Mega Light Bar
    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.08, 0.1),
      this.headlightMaterial
    );
    lightBar.position.set(0, 1.25, 2.42);
    car.add(lightBar);

    // Rear Red Light Bar
    const rearBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.08, 0.1),
      this.taillightMaterial
    );
    rearBar.position.set(0, 1.25, -2.42);
    car.add(rearBar);

    // Massive blocky wheels (radius = 0.54, ground contact at y = 0)
    const wheels = [
      { x: -1.08, y: 0.54, z: 1.55 },
      { x: 1.08, y: 0.54, z: 1.55 },
      { x: -1.08, y: 0.54, z: -1.55 },
      { x: 1.08, y: 0.54, z: -1.55 }
    ];
    car.userData.wheels = [];
    wheels.forEach(pos => {
      const wheel = this.createWheel(0.54, 0.38);
      wheel.position.set(pos.x, pos.y, pos.z);
      car.add(wheel);
      car.userData.wheels.push(wheel);
    });

    // License Plate
    const plate = this.createLicensePlate('DISRUPT');
    plate.position.set(0, 0.75, -2.43);
    plate.rotation.y = Math.PI;
    car.add(plate);

    // Dirt Layer on panels (strictly exterior, bottomY = 0.48)
    this.createDirtClumps(car, 36, 2.1, 1.2, 4.8, 0.48);
    return car;
  }

  // 3. THE ALAMEDA 2004 COROLLA (SBF'S BEATER)
  buildCorolla() {
    const car = new THREE.Group();
    car.userData = {
      name: "The Alameda / SBF 2004 Corolla",
      plate: "HODL-04",
      desc: "The true crypto billionaire mobile. Dented fender, taped window, and 20 years of FTX nostalgia.",
      hornSound: "vintage",
      primaryColor: 0xd4c29a
    };

    // Faded beige body
    const bodyColor = 0xd4c29a;
    const body = this.createVoxelBox(1.75, 0.55, 4.1, bodyColor, 0.1, 0.7);
    body.position.y = 0.65;
    car.add(body);

    // Dented / Mismatched Bumper (Black plastic replacement)
    const frontBumper = this.createVoxelBox(1.77, 0.35, 0.45, 0x222222, 0.05, 0.9);
    frontBumper.position.set(0, 0.48, 2.1);
    frontBumper.rotation.z = 0.04; // Slightly crooked dent!
    car.add(frontBumper);

    // Sedan Greenhouse Cabin
    const cabin = this.createVoxelBox(1.5, 0.62, 2.1, 0x223344);
    cabin.material = this.glassMaterial;
    cabin.position.set(0, 1.2, -0.15);
    car.add(cabin);

    // Beige Roof
    const roof = this.createVoxelBox(1.52, 0.06, 1.9, bodyColor, 0.1, 0.7);
    roof.position.set(0, 1.53, -0.15);
    car.add(roof);

    // Old round headlights
    const hlL = this.createVoxelBox(0.35, 0.22, 0.1, 0xffeedd);
    hlL.material = this.headlightMaterial;
    hlL.position.set(-0.62, 0.68, 2.18);
    car.add(hlL);

    const hlR = hlL.clone();
    hlR.position.x = 0.62;
    car.add(hlR);

    // Taillights
    const tlL = this.createVoxelBox(0.35, 0.2, 0.1, 0xcc1111);
    tlL.material = this.taillightMaterial;
    tlL.position.set(-0.62, 0.72, -2.07);
    car.add(tlL);

    const tlR = tlL.clone();
    tlR.position.x = 0.62;
    car.add(tlR);

    // Steelie Wheels with 1 missing hubcap! (radius = 0.38, ground contact at y = 0)
    const wheels = [
      { x: -0.92, y: 0.38, z: 1.25, missingCap: true },
      { x: 0.92, y: 0.38, z: 1.25, missingCap: false },
      { x: -0.92, y: 0.38, z: -1.25, missingCap: false },
      { x: 0.92, y: 0.38, z: -1.25, missingCap: false }
    ];
    car.userData.wheels = [];
    wheels.forEach(pos => {
      const wheel = this.createWheel(0.38, 0.26);
      if (pos.missingCap) {
        wheel.children[1].material = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      }
      wheel.position.set(pos.x, pos.y, pos.z);
      car.add(wheel);
      car.userData.wheels.push(wheel);
    });

    // License Plate
    const plate = this.createLicensePlate('HODL-04');
    plate.position.set(0, 0.52, -2.08);
    plate.rotation.y = Math.PI;
    car.add(plate);

    // Dirt Layer on panels (Heavy!, strictly exterior, bottomY = 0.38)
    this.createDirtClumps(car, 42, 1.75, 0.9, 4.1, 0.38);
    return car;
  }

  // 4. SBF'S SEIZED LAMBO
  buildLambo() {
    const car = new THREE.Group();
    car.userData = {
      name: "SBF's Seized Lambo",
      plate: "1000X",
      desc: "Purchased with customer deposits in Nassau. Parked across two stalls outside FTX HQ. Needs serious glitter.",
      hornSound: "sports",
      primaryColor: 0xffaa00
    };

    const neonOrange = 0xff7700;
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 });

    // Low aerodynamic wedge body
    const lowerBody = this.createVoxelBox(2.05, 0.48, 4.5, neonOrange, 0.7, 0.2);
    lowerBody.position.y = 0.55;
    car.add(lowerBody);

    // Angled Cockpit
    const cabin = this.createVoxelBox(1.45, 0.52, 2.0, 0x050510);
    cabin.material = this.glassMaterial;
    cabin.position.set(0, 1.0, -0.2);
    car.add(cabin);

    // Roof
    const roof = this.createVoxelBox(1.35, 0.06, 1.6, neonOrange, 0.7, 0.2);
    roof.position.set(0, 1.28, -0.2);
    car.add(roof);

    // Aggressive Front Splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.5), carbonMat);
    splitter.position.set(0, 0.32, 2.3);
    car.add(splitter);

    // Sharp Y-Shape Headlights
    const hlL = this.createVoxelBox(0.4, 0.08, 0.1, 0xffffff);
    hlL.material = this.headlightMaterial;
    hlL.position.set(-0.75, 0.62, 2.27);
    hlL.rotation.z = -0.3;
    car.add(hlL);

    const hlR = hlL.clone();
    hlR.position.x = 0.75;
    hlR.rotation.z = 0.3;
    car.add(hlR);

    // Massive GT Wing Spoiler
    const wingStrutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.15), carbonMat);
    wingStrutL.position.set(-0.65, 1.1, -2.1);
    const wingStrutR = wingStrutL.clone();
    wingStrutR.position.x = 0.65;
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.08, 0.45), carbonMat);
    wingBlade.position.set(0, 1.35, -2.15);

    car.add(wingStrutL);
    car.add(wingStrutR);
    car.add(wingBlade);

    // Low-profile wide wheels with gold rims (radius = 0.42, exact ground contact at y = 0.42)
    const wheels = [
      { x: -1.04, y: 0.42, z: 1.45 },
      { x: 1.04, y: 0.42, z: 1.45 },
      { x: -1.06, y: 0.42, z: -1.45 },
      { x: 1.06, y: 0.42, z: -1.45 }
    ];
    car.userData.wheels = [];
    wheels.forEach(pos => {
      const wheel = this.createWheel(0.42, 0.36);
      wheel.position.set(pos.x, pos.y, pos.z);
      // Gold rim
      wheel.children[1].material = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.2
      });
      car.add(wheel);
      car.userData.wheels.push(wheel);
    });

    // License Plate
    const plate = this.createLicensePlate('1000X');
    plate.position.set(0, 0.48, -2.28);
    plate.rotation.y = Math.PI;
    car.add(plate);

    // Dirt Layer on panels (strictly exterior, bottomY = 0.32)
    this.createDirtClumps(car, 28, 2.05, 0.7, 4.5, 0.32);
    return car;
  }

  // Helper to set dirt opacity from 1.0 (filthy) down to 0.0 (mirror clean)
  setDirtLevel(carGroup, level) {
    const isClean = level <= 0.02;

    carGroup.traverse(child => {
      if (child.name === 'dirtLayer') {
        child.visible = !isClean;
        child.scale.setScalar(isClean ? 0.0001 : 1.0);
        child.traverse(dirtChunk => {
          dirtChunk.visible = !isClean;
          dirtChunk.scale.setScalar(isClean ? 0.0001 : 1.0);
          if (dirtChunk.material && dirtChunk.material.opacity !== undefined) {
            dirtChunk.material.transparent = true;
            dirtChunk.material.opacity = isClean ? 0.0 : Math.max(0, Math.min(1, level));
            dirtChunk.material.needsUpdate = true;
          }
        });
      } else if (child.isMesh && child.material) {
        // Skip dirt mesh chunks so they are never touched by paint logic
        if (child.userData && child.userData.isDirt) return;

        // Dynamic finish adjustment based on cleanliness
        if (child.material === this.glassMaterial) {
          child.material.roughness = isClean ? 0.02 : 0.15;
          child.material.opacity = isClean ? 0.92 : 0.75;
        } else if (child.material === this.rimMaterial) {
          child.material.roughness = isClean ? 0.12 : 0.4;
          child.material.metalness = isClean ? 0.95 : 0.7;
        } else if (child.material === this.tireMaterial) {
          // Wet tire shine
          child.material.roughness = isClean ? 0.55 : 0.9;
        } else if (child.material.metalness !== undefined && child.material !== this.dirtMaterial) {
          // Car paint clearcoat shine
          if (isClean) {
            if (!child.userData.origRoughness) child.userData.origRoughness = child.material.roughness;
            if (!child.userData.origMetalness) child.userData.origMetalness = child.material.metalness;
            child.material.roughness = 0.08;
            child.material.metalness = Math.min(0.9, child.userData.origMetalness + 0.35);
          } else if (child.userData.origRoughness !== undefined) {
            child.material.roughness = child.userData.origRoughness;
            child.material.metalness = child.userData.origMetalness;
          }
        }
      }
    });
  }
}
