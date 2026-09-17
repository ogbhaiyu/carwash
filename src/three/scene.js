import * as THREE from 'three';
import { CarFactory } from './carFactory.js';
import { CleanerAvatar } from './cleaner.js';
import { ParticleSystem } from './particleSystem.js';

export class WashScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.carFactory = new CarFactory();
    this.currentCar = null;
    this.currentCarIndex = 0;
    this.dirtLevel = 1.0; // 1.0 = filthy, 0.0 = spotless mirror shine

    this._prevTime = performance.now();
    this.isWashing = false;
    this.washProgress = 0;
    this.washStage = 'none'; // 'foam', 'scrub', 'rinse', 'complete'

    this.initThree();
    this.buildSiliconValleyEnvironment();
    this.loadCar(0);
    this.setupCleaner();
    this.setupControls();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // California blue sky
    this.scene.fog = new THREE.FogExp2(0xd6e8f5, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(-6.5, 3.8, 7.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Particles
    this.particles = new ParticleSystem(this.scene);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    this.sunLight.position.set(12, 18, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 40;
    this.sunLight.shadow.camera.left = -10;
    this.sunLight.shadow.camera.right = 10;
    this.sunLight.shadow.camera.top = 10;
    this.sunLight.shadow.camera.bottom = -10;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Fill light for soft shadow fill
    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.5);
    fillLight.position.set(-10, 8, -8);
    this.scene.add(fillLight);
  }

  buildSiliconValleyEnvironment() {
    this.envGroup = new THREE.Group();

    // 1. Asphalt Ground
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.85,
      metalness: 0.1
    });
    const groundGeo = new THREE.PlaneGeometry(64, 64);
    const ground = new THREE.Mesh(groundGeo, asphaltMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // 2. Reflective Wet Wash Puddles on Asphalt (Active Carwash Puddles)
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x111620,
      roughness: 0.06,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });

    const createPuddle = (w, d, x, z) => {
      const pGeo = new THREE.CircleGeometry(w, 24);
      pGeo.scale(1, d / w, 1);
      const puddle = new THREE.Mesh(pGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.008, z);
      puddle.receiveShadow = true;
      this.envGroup.add(puddle);
    };

    createPuddle(1.8, 2.8, -0.6, 0.5);
    createPuddle(1.4, 2.2, 0.9, -0.8);
    createPuddle(1.1, 1.6, -1.8, 0.2);

    // 3. Parking Stall Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Yellow paint
    const createStripe = (w, h, x, z, rot = 0) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const stripe = new THREE.Mesh(geo, lineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = rot;
      stripe.position.set(x, 0.012, z);
      this.envGroup.add(stripe);
    };

    // Parking slot boundary lines
    createStripe(0.18, 6.2, -2.5, 0);
    createStripe(0.18, 6.2, 2.5, 0);
    createStripe(5.18, 0.18, 0, -3.1);

    // Text on ground: "RESERVED: SBF ONLY (SEIZED)"
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 512;
    textCanvas.height = 128;
    const tctx = textCanvas.getContext('2d');
    tctx.fillStyle = '#ffcc00';
    tctx.font = '900 38px monospace';
    tctx.textAlign = 'center';
    tctx.fillText('RESERVED: SBF ONLY (SEIZED)', 256, 75);
    const textTex = new THREE.CanvasTexture(textCanvas);
    const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), textMat);
    textPlane.rotation.x = -Math.PI / 2;
    textPlane.position.set(0, 0.016, -2.35);
    this.envGroup.add(textPlane);

    // 4. Sidewalk & Curb
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const sidewalkGeo = new THREE.BoxGeometry(44, 0.35, 10);
    const sidewalk = new THREE.Mesh(sidewalkGeo, curbMat);
    sidewalk.position.set(0, 0.175, -9.8);
    sidewalk.receiveShadow = true;
    this.envGroup.add(sidewalk);

    // Painted yellow curb edge
    const curbEdge = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.36, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.7 })
    );
    curbEdge.position.set(0, 0.18, -4.7);
    this.envGroup.add(curbEdge);

    // 5. FTX Headquarters Building Backdrop (Modern Bahamas Corporate Architecture)
    const buildingWallMat = new THREE.MeshStandardMaterial({
      color: 0x243042,
      metalness: 0.3,
      roughness: 0.45
    });
    const accentPanelMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d66,
      metalness: 0.4,
      roughness: 0.3
    });
    const glassCurtainMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a5f,
      metalness: 0.85,
      roughness: 0.08,
      reflectivity: 0.95,
      clearcoat: 0.8
    });

    // Main Corporate Block
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 12), buildingWallMat);
    mainBuilding.position.set(0, 10, -18);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    this.envGroup.add(mainBuilding);

    // Architectural Portico / Entrance Facade stepping forward
    const entrancePortal = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 1.4), accentPanelMat);
    entrancePortal.position.set(0, 6, -12.4);
    entrancePortal.castShadow = true;
    entrancePortal.receiveShadow = true;
    this.envGroup.add(entrancePortal);

    // Upper Curtain Glass Window Bands
    const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(32, 3.2, 0.3), glassCurtainMat);
    upperGlass.position.set(0, 9.2, -12.3);
    this.envGroup.add(upperGlass);

    // Ground Floor Entrance Lobby Glass (Dark tinted glass behind entrance)
    const lobbyGlass = new THREE.Mesh(
      new THREE.BoxGeometry(11, 3.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.1, metalness: 0.9 })
    );
    lobbyGlass.position.set(0, 1.75, -12.0);
    this.envGroup.add(lobbyGlass);

    // Double Sliding Glass Doors & Mullions
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.7, 0.08), glassCurtainMat);
    doorL.position.set(-1.25, 1.5, -11.9);
    const doorR = doorL.clone();
    doorR.position.set(1.25, 1.5, -11.9);
    this.envGroup.add(doorL);
    this.envGroup.add(doorR);

    // Chrome Door Handles
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.1 });
    const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), chromeMat);
    handleL.position.set(-0.15, 1.4, -11.82);
    const handleR = handleL.clone();
    handleR.position.set(0.15, 1.4, -11.82);
    this.envGroup.add(handleL);
    this.envGroup.add(handleR);

    // Modern Entrance Awning / Canopy
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.25, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x182230, metalness: 0.7, roughness: 0.25 })
    );
    awning.position.set(0, 3.3, -11.0);
    awning.castShadow = true;
    this.envGroup.add(awning);

    // Warm LED Canopy Downlights
    const canopyLight = new THREE.PointLight(0xfff4d0, 2.2, 12);
    canopyLight.position.set(0, 3.1, -10.8);
    this.envGroup.add(canopyLight);

    // 6. BAHAMAS POLICE / LIQUIDATOR CRIME SCENE TAPE (Directly across entrance doors!)
    const makeTape = (y, rotZ, text) => {
      const tapeCanvas = document.createElement('canvas');
      tapeCanvas.width = 1024;
      tapeCanvas.height = 96;
      const tctx = tapeCanvas.getContext('2d');
      tctx.fillStyle = '#ffcc00'; // Police yellow
      tctx.fillRect(0, 0, 1024, 96);

      // Diagonal hazard hashes on edges
      tctx.fillStyle = '#000000';
      for (let i = 0; i < 1024; i += 80) {
        tctx.beginPath();
        tctx.moveTo(i, 0);
        tctx.lineTo(i + 24, 0);
        tctx.lineTo(i + 12, 20);
        tctx.lineTo(i - 12, 20);
        tctx.fill();
        tctx.beginPath();
        tctx.moveTo(i, 76);
        tctx.lineTo(i + 24, 76);
        tctx.lineTo(i + 12, 96);
        tctx.lineTo(i - 12, 96);
        tctx.fill();
      }

      tctx.font = '900 34px sans-serif';
      tctx.textAlign = 'center';
      tctx.fillText(text, 512, 60);

      const tapeTex = new THREE.CanvasTexture(tapeCanvas);
      const tapeMat = new THREE.MeshBasicMaterial({ map: tapeTex, side: THREE.DoubleSide });
      const tapeMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.42), tapeMat);
      tapeMesh.position.set(0, y, -11.8);
      tapeMesh.rotation.z = rotZ;
      return tapeMesh;
    };

    const tape1 = makeTape(1.9, -0.06, '⚠ CRIME SCENE ⚠ FTX PROPERTY SEIZED ⚠ DO NOT CROSS ⚠');
    const tape2 = makeTape(1.2, 0.05, '⚡ SUPREME COURT OF BAHAMAS ⚡ LIQUIDATION ESTATE ⚡');
    this.envGroup.add(tape1);
    this.envGroup.add(tape2);

    // Paper Eviction & Bankruptcy Notice pinned to glass door
    const noticeCanvas = document.createElement('canvas');
    noticeCanvas.width = 256;
    noticeCanvas.height = 340;
    const nctx = noticeCanvas.getContext('2d');
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(0, 0, 256, 340);
    nctx.strokeStyle = '#cc0000';
    nctx.lineWidth = 8;
    nctx.strokeRect(6, 6, 244, 328);

    nctx.fillStyle = '#cc0000';
    nctx.font = 'bold 22px sans-serif';
    nctx.textAlign = 'center';
    nctx.fillText('LEGAL NOTICE', 128, 40);

    nctx.fillStyle = '#111111';
    nctx.font = 'bold 15px monospace';
    nctx.fillText('IN THE SUPREME COURT', 128, 70);
    nctx.fillText('OF THE BAHAMAS', 128, 90);
    nctx.font = '12px monospace';
    nctx.fillText('FTX DIGITAL MARKETS LTD', 128, 120);
    nctx.fillText('COMMERCIAL DIVISION', 128, 140);
    nctx.fillText('CASE 2022/COM/00135', 128, 160);

    nctx.fillStyle = '#b30000';
    nctx.font = 'bold 16px sans-serif';
    nctx.fillText('PREMISES SEIZED', 128, 205);
    nctx.font = '12px monospace';
    nctx.fillText('ALL ASSETS SUBJECT TO', 128, 230);
    nctx.fillText('OFFICIAL LIQUIDATION', 128, 250);
    nctx.fillText('TRESPASSERS ARRESTED', 128, 270);

    nctx.fillStyle = '#0066cc';
    nctx.font = 'bold 11px monospace';
    nctx.fillText('CAR WASH AUTHORIZED', 128, 305);

    const noticeTex = new THREE.CanvasTexture(noticeCanvas);
    const noticeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 1.15),
      new THREE.MeshBasicMaterial({ map: noticeTex })
    );
    noticeMesh.position.set(1.1, 1.7, -11.83);
    this.envGroup.add(noticeMesh);

    // =========================================================================
    // 7. THE PROMINENT 3D ILLUMINATED FTX HEADQUARTERS LOGO & BRAND EMBLEM
    // Mounted at eye-level directly behind the parking bay (y: 3.6 to 6.8)!
    // =========================================================================

    // Sign Backdrop Plate (Expanded to 14.2 x 4.5 for generous separation)
    const signBoardGeo = new THREE.BoxGeometry(14.2, 4.5, 0.22);
    const signBoardMat = new THREE.MeshStandardMaterial({
      color: 0x080d17,
      metalness: 0.85,
      roughness: 0.2
    });
    const signBoard = new THREE.Mesh(signBoardGeo, signBoardMat);
    signBoard.position.set(0, 5.5, -11.8);
    signBoard.castShadow = true;
    this.envGroup.add(signBoard);

    // Glowing Cyan Neon Border Frame around the Sign
    const neonFrameMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.08, 0.26), neonFrameMat);
    fTop.position.set(0, 7.75, -11.8);
    const fBottom = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.08, 0.26), neonFrameMat);
    fBottom.position.set(0, 3.25, -11.8);
    const fLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.58, 0.26), neonFrameMat);
    fLeft.position.set(-7.1, 5.5, -11.8);
    const fRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.58, 0.26), neonFrameMat);
    fRight.position.set(7.1, 5.5, -11.8);
    this.envGroup.add(fTop);
    this.envGroup.add(fBottom);
    this.envGroup.add(fLeft);
    this.envGroup.add(fRight);

    // Architectural Horizontal Neon Divider between 3D letters and subtitle panel
    const fDiv = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.05, 0.26), neonFrameMat);
    fDiv.position.set(0, 5.35, -11.8);
    this.envGroup.add(fDiv);

    // 7A. 3D GLOWING FTX EMBLEM (Symmetrically centered in upper section at y = 6.55)
    const ftxCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00c8e0,
      emissiveIntensity: 2.4,
      roughness: 0.1,
      metalness: 0.3
    });

    const emblemGroup = new THREE.Group();
    // Top wide block
    const bTop = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.36, 0.32), ftxCyanMat);
    bTop.position.set(-2.50, 7.00, -11.62);
    // Middle block
    const bMid = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.36, 0.32), ftxCyanMat);
    bMid.position.set(-2.71, 6.55, -11.62);
    // Bottom block
    const bBot = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.32), ftxCyanMat);
    bBot.position.set(-2.93, 6.10, -11.62);

    bTop.castShadow = true;
    bMid.castShadow = true;
    bBot.castShadow = true;

    emblemGroup.add(bTop);
    emblemGroup.add(bMid);
    emblemGroup.add(bBot);
    this.envGroup.add(emblemGroup);

    // 7B. 3D EXTRUDED BOLD "FTX" LETTERS (Evenly spaced & centered with emblem at y = 6.55)
    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xf0fcff,
      emissive: 0x00d4ea,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.4
    });

    const lettersGroup = new THREE.Group();

    // Letter 'F' (Left edge ~ -1.30, Right edge ~ -0.40)
    const fSpine = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.48, 0.3), letterMat);
    fSpine.position.set(-1.12, 6.55, -11.62);
    const fTopBar = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.36, 0.3), letterMat);
    fTopBar.position.set(-0.85, 7.11, -11.62);
    const fMidBar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.32, 0.3), letterMat);
    fMidBar.position.set(-0.97, 6.60, -11.62);
    lettersGroup.add(fSpine);
    lettersGroup.add(fTopBar);
    lettersGroup.add(fMidBar);

    // Letter 'T' (Left edge ~ +0.12, Right edge ~ +1.42)
    const tCross = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.36, 0.3), letterMat);
    tCross.position.set(0.77, 7.11, -11.62);
    const tStem = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.48, 0.3), letterMat);
    tStem.position.set(0.77, 6.55, -11.62);
    lettersGroup.add(tCross);
    lettersGroup.add(tStem);

    // Letter 'X' (Left edge ~ +1.94, Right edge ~ +3.14)
    const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.58, 0.3), letterMat);
    xBar1.position.set(2.54, 6.55, -11.62);
    xBar1.rotation.z = 0.62;
    const xBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.58, 0.3), letterMat);
    xBar2.position.set(2.54, 6.55, -11.62);
    xBar2.rotation.z = -0.62;
    lettersGroup.add(xBar1);
    lettersGroup.add(xBar2);

    this.envGroup.add(lettersGroup);

    // 7C. Crisp Backlit Subtitle Panel (Mounted safely below divider at y = 4.28)
    const subCanvas = document.createElement('canvas');
    subCanvas.width = 2048;
    subCanvas.height = 512;
    const subCtx = subCanvas.getContext('2d');

    // Solid dark contrast background with subtle cyan glow border
    subCtx.fillStyle = '#060c18';
    subCtx.fillRect(0, 0, 2048, 512);

    subCtx.strokeStyle = '#00f2fe';
    subCtx.lineWidth = 10;
    subCtx.strokeRect(10, 10, 2028, 492);

    // Subtitle 1: Corporate Headquarters Location (No redundant FTX letters underneath)
    subCtx.fillStyle = '#00f2fe';
    subCtx.font = '900 78px sans-serif';
    subCtx.textAlign = 'center';
    subCtx.fillText('GLOBAL HEADQUARTERS  •  NASSAU, BAHAMAS', 1024, 115);

    // Subtitle 2: Bahamas Seizure Warning in bold high-contrast red
    subCtx.fillStyle = '#ff3344';
    subCtx.font = '900 68px monospace';
    subCtx.fillText('⚡ PROPERTY SEIZED BY ORDER OF SUPREME COURT OF THE BAHAMAS ⚡', 1024, 235);

    // Subtitle 3: Authorized Parking only in vivid gold
    subCtx.fillStyle = '#ffe600';
    subCtx.font = '900 56px monospace';
    subCtx.fillText('AUTHORIZED PARKING: LIQUIDATORS & BHAI\'S MOBILE CAR WASH ONLY', 1024, 355);

    // Subtitle 4: Chapter 11 footer in bright clean white
    subCtx.fillStyle = '#e2e8f0';
    subCtx.font = 'bold 44px monospace';
    subCtx.fillText('CHAPTER 11 BANKRUPTCY ESTATE  |  ASSET RECOVERY ZONE', 1024, 450);

    const subTex = new THREE.CanvasTexture(subCanvas);
    subTex.colorSpace = THREE.SRGBColorSpace;
    subTex.generateMipmaps = true;
    subTex.minFilter = THREE.LinearMipmapLinearFilter;
    subTex.magFilter = THREE.LinearFilter;
    subTex.anisotropy = 16;

    const subMat = new THREE.MeshBasicMaterial({ map: subTex });
    const subMesh = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 1.7), subMat);
    subMesh.position.set(0, 4.28, -11.66);
    this.envGroup.add(subMesh);

    // Dedicated Cyan Neon Spotlights Illuminating the FTX Sign & Entrance
    const neonSpotL = new THREE.SpotLight(0x00f2fe, 3.8, 22, Math.PI / 4, 0.35);
    neonSpotL.position.set(-5, 9, -7);
    neonSpotL.target = signBoard;
    this.envGroup.add(neonSpotL);

    const neonSpotR = new THREE.SpotLight(0x00f2fe, 3.8, 22, Math.PI / 4, 0.35);
    neonSpotR.position.set(5, 9, -7);
    neonSpotR.target = signBoard;
    this.envGroup.add(neonSpotR);

    // 8. Modern Concrete Planters & Tropical Foliage Flanking Entrance
    const createPlanter = (x) => {
      const planterMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const planter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.2), planterMat);
      planter.position.set(x, 0.35, -11.2);
      planter.castShadow = true;
      this.envGroup.add(planter);

      // Tropical Bush Foliage
      const bushMat = new THREE.MeshStandardMaterial({ color: 0x1e6b2c, roughness: 0.7 });
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), bushMat);
      bush.scale.set(1.3, 0.9, 0.7);
      bush.position.set(x, 1.05, -11.2);
      bush.castShadow = true;
      this.envGroup.add(bush);

      // Bright Pink Tropical Hibiscus Flowers
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.5 });
      for (let f = 0; f < 3; f++) {
        const flower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), flowerMat);
        flower.position.set(x + (f - 1) * 0.5, 1.25 + (f % 2) * 0.15, -10.9);
        this.envGroup.add(flower);
      }
    };
    createPlanter(-7.2);
    createPlanter(7.2);

    // 9. Curbside Crypto Easter Eggs (SBF Flip-Flops & Legal Papers)
    // SBF's iconic blue rubber slide sandals abandoned on the curb
    const sandalMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.55), sandalMat);
    s1.position.set(2.4, 0.39, -6.8);
    s1.rotation.y = 0.4;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.55), sandalMat);
    s2.position.set(2.7, 0.39, -6.65);
    s2.rotation.y = -0.3;
    this.envGroup.add(s1);
    this.envGroup.add(s2);

    // Crumpled legal document on sidewalk
    const docMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const doc = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.52), docMat);
    doc.rotation.x = -Math.PI / 2;
    doc.rotation.z = 0.5;
    doc.position.set(-2.8, 0.36, -6.2);
    this.envGroup.add(doc);

    // 10. California / Bahamas Palm Trees
    this.buildPalmTree(-9.5, 0, -8.2);
    this.buildPalmTree(9.5, 0, -8.2);
    this.buildPalmTree(14.5, 0, -4.5);

    // 11. Fire Hydrant & Water Hose
    this.buildFireHydrant(3.4, 0, 1.8);

    // 12. Traffic Cones (Marking car stall corners, safely clear of Bhai and the cardboard sign)
    this.buildTrafficCone(-1.1, 0, 3.4);
    this.buildTrafficCone(2.9, 0, 2.8);

    this.scene.add(this.envGroup);
  }

  buildPalmTree(x, y, z) {
    const palm = new THREE.Group();
    palm.position.set(x, y, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });

    // Voxel curved trunk segments
    for (let i = 0; i < 9; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.55 - i * 0.03, 0.9, 0.55 - i * 0.03), trunkMat);
      seg.position.set(Math.sin(i * 0.25) * 0.35, i * 0.85 + 0.45, 0);
      seg.castShadow = true;
      palm.add(seg);
    }

    // Palm Crown Fronds
    const frondAngles = [0, 60, 120, 180, 240, 300];
    frondAngles.forEach(deg => {
      const rad = (deg * Math.PI) / 180;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 2.6), leafMat);
      frond.position.set(Math.sin(rad) * 1.2, 8.2, Math.cos(rad) * 1.2);
      frond.rotation.y = rad;
      frond.rotation.x = 0.35;
      frond.castShadow = true;
      palm.add(frond);
    });

    // Coconut bunch
    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    for (let c = 0; c < 3; c++) {
      const coco = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24), cocoMat);
      const angle = (c * 2 * Math.PI) / 3;
      coco.position.set(Math.cos(angle) * 0.45, 7.85, Math.sin(angle) * 0.45);
      coco.castShadow = true;
      palm.add(coco);
    }

    this.envGroup.add(palm);
  }

  buildFireHydrant(x, y, z) {
    const hydrant = new THREE.Group();
    hydrant.position.set(x, y, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.3 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 8), redMat);
    body.position.y = 0.4;
    body.castShadow = true;
    hydrant.add(body);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.2, 8), redMat);
    cap.position.y = 0.9;
    hydrant.add(cap);

    // Hose nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8), brassMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(-0.25, 0.5, 0);
    hydrant.add(nozzle);

    // Green coiled garden hose on the pavement
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.7 });
    const hoseGeo = new THREE.TorusGeometry(0.45, 0.06, 8, 20);
    hoseGeo.rotateX(Math.PI / 2);
    const hose = new THREE.Mesh(hoseGeo, hoseMat);
    hose.position.set(-0.5, 0.06, 0.3);
    hydrant.add(hose);

    this.envGroup.add(hydrant);
  }

  buildTrafficCone(x, y, z) {
    const cone = new THREE.Group();
    cone.position.set(x, y, z);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), baseMat);
    base.position.y = 0.03;
    cone.add(base);

    const lowerCone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.35, 8), orangeMat);
    lowerCone.position.y = 0.22;
    cone.add(lowerCone);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.15, 8), whiteMat);
    stripe.position.y = 0.45;
    cone.add(stripe);

    const upperCone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.25, 8), orangeMat);
    upperCone.position.y = 0.65;
    cone.add(upperCone);

    this.envGroup.add(cone);
  }

  setupCleaner() {
    this.cleaner = new CleanerAvatar();
    this.cleaner.group.position.set(-1.85, 0, 0);
    this.scene.add(this.cleaner.group);
  }

  setupControls() {
    // Smooth pointer drag orbit controls (manual rotation only)
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    // Exact zoomed-in hero framing: front 3/4 view, centered car & FTX sign
    this.defaultCameraAngle = { theta: 0.14, phi: 0.18, radius: 8.2 };
    this.cameraAngle = { ...this.defaultCameraAngle };

    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraAngle.theta -= deltaX * 0.007;
      this.cameraAngle.phi = Math.max(0.10, Math.min(Math.PI / 2.2, this.cameraAngle.phi - deltaY * 0.007));

      this.updateCameraPos();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Touch support for mobile
    dom.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', e => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.cameraAngle.theta -= deltaX * 0.007;
      this.cameraAngle.phi = Math.max(0.10, Math.min(Math.PI / 2.2, this.cameraAngle.phi - deltaY * 0.007));

      this.updateCameraPos();
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    // Mouse wheel zoom
    dom.addEventListener('wheel', e => {
      this.cameraAngle.radius = Math.max(4.5, Math.min(16, this.cameraAngle.radius + e.deltaY * 0.01));
      this.updateCameraPos();
    }, { passive: true });

    this.updateCameraPos();
  }

  updateCameraPos() {
    const x = this.cameraAngle.radius * Math.sin(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);
    const y = this.cameraAngle.radius * Math.sin(this.cameraAngle.phi) + 1.25;
    const z = this.cameraAngle.radius * Math.cos(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1.15, -0.4);
  }

  resetCamera() {
    this.cameraAngle = { ...this.defaultCameraAngle };
    this.updateCameraPos();
  }

  loadCar(index) {
    if (this.currentCar) {
      this.scene.remove(this.currentCar);
    }
    this.currentCarIndex = index;
    switch (index) {
      case 0:
        this.currentCar = this.carFactory.buildTeslaModelY();
        break;
      case 1:
        this.currentCar = this.carFactory.buildCyberTruck();
        break;
      case 2:
        this.currentCar = this.carFactory.buildCorolla();
        break;
      case 3:
        this.currentCar = this.carFactory.buildLambo();
        break;
      default:
        this.currentCar = this.carFactory.buildTeslaModelY();
    }

    this.dirtLevel = 1.0;
    this.carFactory.setDirtLevel(this.currentCar, this.dirtLevel);
    this.scene.add(this.currentCar);
    return this.currentCar.userData;
  }

  // Trigger Car Horn Bounce & SFX
  honkCar() {
    if (!this.currentCar) return;
    const car = this.currentCar;
    const initialY = car.position.y;

    // Bounce animation
    let hopTime = 0;
    const hop = () => {
      hopTime += 0.06;
      car.position.y = initialY + Math.sin(hopTime * Math.PI) * 0.18;
      if (hopTime < 1.0) {
        requestAnimationFrame(hop);
      } else {
        car.position.y = initialY;
      }
    };
    hop();

    this.particles.emitHonkWave(car.position);
  }

  // Cinematic Car Wash Sequence
  startWashSequence(onPhaseChange, onComplete) {
    if (this.isWashing) return;
    this.isWashing = true;
    this.washProgress = 0;

    let washDuration = 12.0; // 12 seconds of pure Bollywood carwash comedy!
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 0.05;
      this.washProgress = elapsed / washDuration;

      // Phase 1: 0% - 30% -> Turbo Foam Blast
      if (this.washProgress < 0.32) {
        if (this.washStage !== 'foam') {
          this.washStage = 'foam';
          this.cleaner.setState('wash_foam');
          if (onPhaseChange) onPhaseChange('foam', 'Applying 10x Full-Stack Detergent...', 0.85);
        }
        // Emit soap foam stream from Bhai's right hand to car
        const sourcePos = new THREE.Vector3(
          this.cleaner.group.position.x + this.cleaner.characterGroup.position.x + 0.1,
          1.1,
          this.cleaner.group.position.z + this.cleaner.characterGroup.position.z + 0.3
        );
        const targetPos = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.8, (Math.random() - 0.5) * 2.5);
        this.particles.emitFoam(sourcePos, targetPos, 4);

      // Phase 2: 32% - 70% -> Vigorous Bhangra Scrub
      } else if (this.washProgress < 0.72) {
        if (this.washStage !== 'scrub') {
          this.washStage = 'scrub';
          this.cleaner.setState('wash_scrub');
        }

        // Reduce dirt level progressively
        const scrubProgress = (this.washProgress - 0.32) / 0.4;
        this.dirtLevel = Math.max(0.05, 1.0 - scrubProgress);
        this.carFactory.setDirtLevel(this.currentCar, this.dirtLevel);

        if (onPhaseChange) onPhaseChange('scrub', 'Bhai is dancing Bhangra & scrubbing rims with Vim Bar...', this.dirtLevel);

      // Phase 3: 72% - 95% -> Hydro Jet Rinse
      } else if (this.washProgress < 0.95) {
        if (this.washStage !== 'rinse') {
          this.washStage = 'rinse';
          this.cleaner.setState('wash_rinse');
          if (onPhaseChange) onPhaseChange('rinse', 'High-Pressure Hydro Blast: Rinsing away Silicon Valley dust...', 0.15);
        }

        // Emit water particles from Bhai's nozzle
        const waterSource = new THREE.Vector3(
          this.cleaner.group.position.x + this.cleaner.characterGroup.position.x + 0.1,
          1.1,
          this.cleaner.group.position.z + this.cleaner.characterGroup.position.z + 0.3
        );
        const waterTarget = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.6, (Math.random() - 0.5) * 2.8);
        this.particles.emitWaterJet(waterSource, waterTarget, 8);

        // Remove dirt completely
        this.dirtLevel = 0.0;
        this.carFactory.setDirtLevel(this.currentCar, 0.0);

      // Phase 4: 95% - 100% -> Victory & Sparkle
      } else {
        clearInterval(interval);
        this.isWashing = false;
        this.washStage = 'complete';
        this.cleaner.setState('victory');
        this.dirtLevel = 0.0;
        this.carFactory.setDirtLevel(this.currentCar, 0.0);

        // Burst sparkles
        this.particles.emitSparkles(new THREE.Vector3(0, 0.8, 0), 30);

        if (onPhaseChange) onPhaseChange('complete', 'Car is 100% On-Chain Clean! Sahib, please take receipt.', 0.0);
        if (onComplete) onComplete(this.currentCar.userData);
      }
    }, 50);
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    const now = performance.now();
    const delta = Math.min((now - this._prevTime) / 1000, 0.1);
    this._prevTime = now;

    if (this.cleaner) {
      this.cleaner.update(delta);
    }
    if (this.particles) {
      this.particles.update(delta);
    }

    // Sparkle pulse when car is clean
    if (this.dirtLevel === 0 && Math.random() < 0.12) {
      this.particles.emitSparkles(new THREE.Vector3(0, 0.6, 0), 2);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
