import * as THREE from 'three';

export class CleanerAvatar {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cleanerAvatar';

    this.state = 'idle'; // 'idle', 'wash_foam', 'wash_scrub', 'wash_rinse', 'victory'
    this.animTime = 0;

    this.buildCharacter();
    this.buildProps();
  }

  createBox(w, h, d, color, roughness = 0.6, metalness = 0.1) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildCharacter() {
    this.characterGroup = new THREE.Group();

    // Skin Tone
    const skinColor = 0xb07850;
    const shirtColor = 0x2255aa;
    const pantsColor = 0x1f2a44;
    const bootColor = 0xf5b002; // Yellow gumboots
    const gloveColor = 0xf5b002; // Yellow wash gloves

    // 1. Torso
    this.torso = this.createBox(0.7, 0.9, 0.45, shirtColor);
    this.torso.position.y = 1.35;
    this.characterGroup.add(this.torso);

    // Visitor Lanyard Badge
    const badge = this.createBox(0.2, 0.28, 0.04, 0xffffff);
    badge.position.set(0, 1.25, 0.24);
    this.characterGroup.add(badge);
    const lanyardL = this.createBox(0.04, 0.4, 0.02, 0xff3300);
    lanyardL.position.set(-0.12, 1.5, 0.23);
    lanyardL.rotation.z = -0.25;
    const lanyardR = lanyardL.clone();
    lanyardR.position.x = 0.12;
    lanyardR.rotation.z = 0.25;
    this.characterGroup.add(lanyardL);
    this.characterGroup.add(lanyardR);

    // 2. Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.05, 0);

    const headMesh = this.createBox(0.5, 0.5, 0.5, skinColor);
    this.headGroup.add(headMesh);

    // Hair
    const hair = this.createBox(0.54, 0.2, 0.54, 0x111111);
    hair.position.y = 0.25;
    this.headGroup.add(hair);

    // Aviator Sunglasses
    const glassesFrame = this.createBox(0.48, 0.15, 0.08, 0xd4af37, 0.2, 0.9); // Gold frame
    glassesFrame.position.set(0, 0.05, 0.28);
    this.headGroup.add(glassesFrame);

    const lensL = this.createBox(0.18, 0.12, 0.02, 0x111111);
    lensL.position.set(-0.12, 0.05, 0.32);
    const lensR = lensL.clone();
    lensR.position.x = 0.12;
    this.headGroup.add(lensL);
    this.headGroup.add(lensR);

    // Glorious Mustache
    const stache = this.createBox(0.36, 0.1, 0.06, 0x111111);
    stache.position.set(0, -0.12, 0.28);
    this.headGroup.add(stache);

    this.characterGroup.add(this.headGroup);

    // 3. Right Arm (Foam Sprayer / Sponge)
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(-0.48, 1.7, 0);

    this.rightArm = this.createBox(0.22, 0.65, 0.22, shirtColor);
    this.rightArm.position.y = -0.32;
    this.rightArmPivot.add(this.rightArm);

    this.rightHand = this.createBox(0.24, 0.25, 0.24, gloveColor);
    this.rightHand.position.y = -0.68;
    this.rightArmPivot.add(this.rightHand);

    this.characterGroup.add(this.rightArmPivot);

    // 4. Left Arm (Washcloth / Sponge)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(0.48, 1.7, 0);

    this.leftArm = this.createBox(0.22, 0.65, 0.22, shirtColor);
    this.leftArm.position.y = -0.32;
    this.leftArmPivot.add(this.leftArm);

    this.leftHand = this.createBox(0.24, 0.25, 0.24, gloveColor);
    this.leftHand.position.y = -0.68;
    this.leftArmPivot.add(this.leftHand);

    // Yellow Sponge in left hand
    this.sponge = this.createBox(0.28, 0.18, 0.35, 0xffea00);
    this.sponge.position.set(0, -0.76, 0.08);
    this.leftArmPivot.add(this.sponge);

    this.characterGroup.add(this.leftArmPivot);

    // 5. Legs & Boots
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(-0.2, 0.9, 0);
    const rightLeg = this.createBox(0.24, 0.6, 0.24, pantsColor);
    rightLeg.position.y = -0.3;
    const rightBoot = this.createBox(0.26, 0.35, 0.36, bootColor);
    rightBoot.position.set(0, -0.68, 0.05);
    this.rightLegPivot.add(rightLeg);
    this.rightLegPivot.add(rightBoot);
    this.characterGroup.add(this.rightLegPivot);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(0.2, 0.9, 0);
    const leftLeg = this.createBox(0.24, 0.6, 0.24, pantsColor);
    leftLeg.position.y = -0.3;
    const leftBoot = this.createBox(0.26, 0.35, 0.36, bootColor);
    leftBoot.position.set(0, -0.68, 0.05);
    this.leftLegPivot.add(leftLeg);
    this.leftLegPivot.add(leftBoot);
    this.characterGroup.add(this.leftLegPivot);

    this.group.add(this.characterGroup);
  }

  buildProps() {
    // 1. High-Pressure Foam Gun attached to right hand
    this.foamGun = new THREE.Group();
    const gunBody = this.createBox(0.12, 0.15, 0.5, 0x222222, 0.3, 0.8);
    const nozzle = this.createBox(0.08, 0.08, 0.6, 0xd4af37, 0.2, 0.9);
    nozzle.position.z = 0.45;
    const soapBottle = this.createBox(0.18, 0.28, 0.18, 0x00f2fe, 0.1, 0.1);
    soapBottle.position.set(0, -0.2, 0.15);

    this.foamGun.add(gunBody);
    this.foamGun.add(nozzle);
    this.foamGun.add(soapBottle);
    this.foamGun.position.set(0, -0.68, 0.3);
    this.rightArmPivot.add(this.foamGun);

    // 2. Iconic Indian Wash Bucket on the ground (to the left of Bhai, safely away from car)
    this.bucketGroup = new THREE.Group();
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0xf5b002, roughness: 0.4, metalness: 0.1 });
    const bucketGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.48, 16);
    const bucketMesh = new THREE.Mesh(bucketGeo, bucketMat);
    bucketMesh.position.y = 0.24;
    bucketMesh.castShadow = true;
    bucketMesh.receiveShadow = true;

    // Rim ring
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd99500, roughness: 0.5 });
    const rimGeo = new THREE.TorusGeometry(0.28, 0.025, 8, 20);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.48;

    // Frothy White Soap Suds inside bucket
    const sudsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
    const sudsGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16);
    const sudsMesh = new THREE.Mesh(sudsGeo, sudsMat);
    sudsMesh.position.y = 0.45;

    // Green Vim Dishwashing Bar on rim
    const vimBar = this.createBox(0.14, 0.05, 0.08, 0x00cc44);
    vimBar.position.set(0.20, 0.49, 0);

    // Chrome wire carry handle tilted to the side
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    const handleGeo = new THREE.TorusGeometry(0.27, 0.015, 6, 16, Math.PI);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0.44, 0);
    handle.rotation.z = -0.4;

    this.bucketGroup.add(bucketMesh);
    this.bucketGroup.add(rim);
    this.bucketGroup.add(sudsMesh);
    this.bucketGroup.add(vimBar);
    this.bucketGroup.add(handle);
    this.bucketGroup.position.set(-1.6, 0, 0.4);
    this.group.add(this.bucketGroup);

    // 3. Hand-written Cardboard Sign
    this.buildCardboardSign();
  }

  buildCardboardSign() {
    const signGroup = new THREE.Group();
    const board = this.createBox(1.7, 1.25, 0.05, 0xd4a373);
    board.position.set(0, 0.82, 0);
    board.rotation.x = -0.08;
    signGroup.add(board);

    // Ultra high-res canvas (2048 x 1536) for crystal-clear readability from any distance
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d');

    // Clean, bright cardboard surface
    ctx.fillStyle = '#f8e4c8';
    ctx.fillRect(0, 0, 2048, 1536);

    // Subtle corrugated texture lines
    ctx.fillStyle = 'rgba(180, 130, 80, 0.08)';
    for (let y = 0; y < 1536; y += 14) {
      ctx.fillRect(0, y, 2048, 4);
    }

    // Bold thick marker border
    ctx.strokeStyle = '#1e1107';
    ctx.lineWidth = 26;
    ctx.strokeRect(30, 30, 1988, 1476);

    ctx.strokeStyle = '#8c531b';
    ctx.lineWidth = 8;
    ctx.strokeRect(50, 50, 1948, 1436);

    // Header badge
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ SBF\'S SEIZED PARKING SPOT ★', 1024, 155);

    // Main line 1: WILL CODE PYTHON
    ctx.fillStyle = '#000000';
    ctx.font = '900 140px monospace';
    ctx.fillText('WILL CODE PYTHON', 1024, 335);

    // Main line 2: OR WASH YOUR CAR
    ctx.fillStyle = '#000000';
    ctx.font = '900 140px monospace';
    ctx.fillText('OR WASH YOUR CAR', 1024, 505);

    // Highlight line 3: FOR SOLANA / ETH
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 156px monospace';
    ctx.fillText('FOR SOLANA / ETH', 1024, 715);

    // Decorative separator line
    ctx.strokeStyle = '#1e1107';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(220, 785);
    ctx.lineTo(1828, 785);
    ctx.stroke();

    // Line 4: NEED $ FOR H-1B & SAMOSA
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 120px sans-serif';
    ctx.fillText('NEED $ FOR H-1B & SAMOSA', 1024, 955);

    // Sub-line: EX-FOUNDER NOW DETAILING
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 84px monospace';
    ctx.fillText('EX-TECH FOUNDER • 10x FAST', 1024, 1095);

    // Line 5: ROBINHOOD WALLET ACCEPTED
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '900 115px monospace';
    ctx.fillText('ROBINHOOD WALLET ACCEPTED', 1024, 1275);

    // Footer badge
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 76px monospace';
    ctx.fillText('⚡ 100% ON-CHAIN • INSTANT START ⚡', 1024, 1420);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;

    const signMat = new THREE.MeshBasicMaterial({ map: texture });
    const signGeo = new THREE.PlaneGeometry(1.66, 1.22);
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 0.82, 0.035);
    signMesh.rotation.x = -0.08;
    signGroup.add(signMesh);

    // Kickstand
    const stand = this.createBox(0.09, 1.1, 0.08, 0x6b4423);
    stand.position.set(0, 0.45, -0.28);
    stand.rotation.x = 0.35;
    signGroup.add(stand);

    // Position: safely at x = -2.0, z = 1.4, completely outside Bhai's detailing & dancing path
    signGroup.position.set(-2.0, 0, 1.4);
    signGroup.rotation.y = 0.48;
    this.group.add(signGroup);
  }

  // Update Animation
  update(delta) {
    this.animTime += delta;
    const t = this.animTime;

    if (this.state === 'idle') {
      // Gentle Desi groove: head bobble, foot tap, sponge sway
      this.characterGroup.position.set(0, Math.abs(Math.sin(t * 4)) * 0.05, 0);
      this.characterGroup.rotation.y = 0.35; // Welcoming angle facing car and camera

      this.headGroup.rotation.z = Math.sin(t * 3.5) * 0.12; // Famous Indian head bobble!
      this.headGroup.rotation.y = Math.sin(t * 1.5) * 0.18;

      this.rightArmPivot.rotation.x = Math.sin(t * 2) * 0.15;
      this.leftArmPivot.rotation.x = Math.sin(t * 2.5 + 1) * 0.2;
      this.rightLegPivot.rotation.x = Math.sin(t * 4) * 0.08;
      this.leftLegPivot.rotation.x = -Math.sin(t * 4) * 0.08;

    } else if (this.state === 'wash_foam') {
      // Aiming foam gun and spraying along car
      this.characterGroup.position.x = Math.sin(t * 1.5) * 0.12;
      this.characterGroup.position.z = Math.sin(t * 1.2) * 1.3;
      this.characterGroup.position.y = Math.abs(Math.sin(t * 16)) * 0.03;
      this.characterGroup.rotation.y = Math.PI / 2 + Math.sin(t * 2) * 0.2;

      // Arm aiming foam nozzle up and down
      this.rightArmPivot.rotation.x = -1.2 + Math.sin(t * 5) * 0.35;
      this.rightArmPivot.rotation.y = Math.sin(t * 3) * 0.4;
      this.leftArmPivot.rotation.x = -0.3;

      this.headGroup.rotation.z = Math.sin(t * 4) * 0.15;

    } else if (this.state === 'wash_scrub') {
      // FULL BHANGRA SCRUB MODE!
      // High energetic bounces, jumping around car, vigorous sponge scrubbing
      const scrubSpeed = 10;
      this.characterGroup.position.y = Math.abs(Math.sin(t * 8)) * 0.22; // Energetic hopping
      this.characterGroup.position.x = -0.05 + Math.cos(t * 2.5) * 0.14;
      this.characterGroup.position.z = Math.sin(t * 2.0) * 1.4;
      this.characterGroup.rotation.y = Math.PI / 2 + Math.sin(t * 4) * 0.35;

      // Vigorous circular sponge scrubbing with left arm
      this.leftArmPivot.rotation.x = -1.4 + Math.sin(t * scrubSpeed) * 0.6;
      this.leftArmPivot.rotation.z = 0.5 + Math.cos(t * scrubSpeed) * 0.5;

      // Right arm pumping Bhangra style!
      this.rightArmPivot.rotation.x = -2.2 + Math.sin(t * 8) * 0.4;
      this.rightArmPivot.rotation.z = -0.6 + Math.cos(t * 8) * 0.3;

      // Head bobble at peak energy
      this.headGroup.rotation.z = Math.sin(t * 8) * 0.28;
      this.headGroup.rotation.x = Math.sin(t * 4) * 0.15;

      // Legs kicking in rhythm
      this.rightLegPivot.rotation.x = Math.sin(t * 8) * 0.6;
      this.leftLegPivot.rotation.x = -Math.sin(t * 8) * 0.6;

    } else if (this.state === 'wash_rinse') {
      // High-pressure hydro blast rinse along car
      this.characterGroup.position.x = -0.08 + Math.cos(t * 1.8) * 0.12;
      this.characterGroup.position.z = Math.sin(t * 1.5) * 1.3;
      this.characterGroup.position.y = Math.abs(Math.sin(t * 12)) * 0.02;
      this.characterGroup.rotation.y = Math.PI / 2 - 0.15;

      this.rightArmPivot.rotation.x = -1.3 + Math.sin(t * 6) * 0.25;
      this.rightArmPivot.rotation.y = Math.sin(t * 4) * 0.5;
      this.leftArmPivot.rotation.x = -0.2;

    } else if (this.state === 'victory') {
      // Victory pose: Hands up ("Balle Balle!"), big bounce, chef's kiss
      this.characterGroup.position.set(-0.25, Math.abs(Math.sin(t * 4)) * 0.14, 0.2);
      this.characterGroup.rotation.y = Math.PI / 3;

      // Both arms raised high!
      this.rightArmPivot.rotation.x = -2.6 + Math.sin(t * 4) * 0.15;
      this.rightArmPivot.rotation.z = -0.4;
      this.leftArmPivot.rotation.x = -2.6 - Math.sin(t * 4) * 0.15;
      this.leftArmPivot.rotation.z = 0.4;

      this.headGroup.rotation.z = Math.sin(t * 5) * 0.2;
      this.headGroup.rotation.x = -0.15; // Proud look
    }
  }

  setState(newState) {
    this.state = newState;
    this.animTime = 0;
  }
}
