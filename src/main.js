import './style.css';
import { WashScene } from './three/scene.js';
import { HUD } from './ui/hud.js';
import { PaymentModal } from './crypto/payment.js';
import { InvoiceModal } from './ui/invoice.js';
import { soundEngine } from './audio/soundEngine.js';

const CARS_METADATA = [
  {
    idx: 0,
    shortName: "VC's Tesla Y",
    emoji: "⚡",
    name: "The VC's Muddy Tesla Model Y",
    plate: "AI-CHAD",
    desc: "Parked outside FTX HQ. Covered in Bahamas sand and spilled SBF's energy drink."
  },
  {
    idx: 1,
    shortName: "Palo Alto Cybertruck",
    emoji: "📐",
    name: "The Palo Alto CyberTruck",
    plate: "DISRUPT",
    desc: "Smudged with tech founder fingerprints and Lake Tahoe pine dust. 100% cold-rolled stainless steel."
  },
  {
    idx: 2,
    shortName: "SBF's '04 Corolla",
    emoji: "🚙",
    name: "The Alameda / SBF 2004 Corolla",
    plate: "HODL-04",
    desc: "The true crypto billionaire mobile. Dented fender, taped window, and 20 years of FTX nostalgia."
  },
  {
    idx: 3,
    shortName: "SBF's Lambo",
    emoji: "🚗",
    name: "SBF's Seized Lambo",
    plate: "1000X",
    desc: "Parked across two EV spots while the GP takes a 3-hour omakase lunch. Needs serious glitter."
  }
];

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.currentCarData = CARS_METADATA[0];
    this.lastPaymentData = null;

    this.init();
  }

  init() {
    // 1. Initialize 3D Scene
    this.scene = new WashScene(this.container);

    // 2. Initialize HUD
    this.hud = new HUD({
      cars: CARS_METADATA,
      onSelectCar: idx => this.handleSelectCar(idx),
      onHonk: () => this.handleHonk(),
      onOpenPay: () => this.paymentModal.show('series-a'),
      onToggleAudio: () => soundEngine.toggleMute(),
      onResetCamera: () => this.scene.resetCamera()
    });

    // 3. Initialize Payment Modal
    this.paymentModal = new PaymentModal(paymentData => {
      this.handlePaymentVerified(paymentData);
    });

    // 4. Initialize Invoice Modal
    this.invoiceModal = new InvoiceModal(
      () => this.handleReset(),
      () => this.paymentModal.show('seed') // Tip Bhai with a Seed Chai
    );

    // Set initial car info in HUD
    this.hud.updateCarInfo(this.currentCarData);
    this.hud.updateDirtStatus(1.0);

    // Start 3D Render Loop
    this.animate();
  }

  handleSelectCar(idx) {
    this.currentCarData = CARS_METADATA[idx];
    if (this.scene.cleaner) {
      this.scene.cleaner.setState('idle');
    }
    const carData = this.scene.loadCar(idx);
    this.hud.updateCarInfo(carData);
    this.hud.updateDirtStatus(1.0);
    this.hud.setWashingState(false);
    soundEngine.playSpongeSqueak();
  }

  handleHonk() {
    soundEngine.playDesiHorn();
    this.scene.honkCar();
  }

  handlePaymentVerified(paymentData) {
    this.lastPaymentData = paymentData;

    // Start music and hide normal HUD
    soundEngine.startBhangraMusic();
    this.hud.setWashingState(true);

    // Start wash sequence
    let currentPhase = '';
    let phaseSfxInterval = null;

    this.scene.startWashSequence(
      (phase, text, dirtLevel) => {
        currentPhase = phase;
        this.hud.updateWashPhase(phase, text);
        this.hud.updateDirtStatus(dirtLevel, phase);

        if (phaseSfxInterval) {
          clearInterval(phaseSfxInterval);
          phaseSfxInterval = null;
        }

        if (phase === 'foam') {
          soundEngine.playFoamSpray();
          phaseSfxInterval = setInterval(() => {
            if (currentPhase === 'foam') soundEngine.playFoamSpray();
          }, 1400);
        } else if (phase === 'scrub') {
          soundEngine.playSpongeSqueak();
          phaseSfxInterval = setInterval(() => {
            if (currentPhase === 'scrub') soundEngine.playSpongeSqueak();
          }, 600);
        } else if (phase === 'rinse') {
          soundEngine.playWaterJet();
          phaseSfxInterval = setInterval(() => {
            if (currentPhase === 'rinse') soundEngine.playWaterJet();
          }, 1100);
        }
      },
      carData => {
        // Complete!
        if (phaseSfxInterval) clearInterval(phaseSfxInterval);
        this.hud.setWashingState(false);
        this.hud.updateDirtStatus(0.0, 'complete');
        soundEngine.stopBhangraMusic();

        // Show official invoice
        setTimeout(() => {
          this.invoiceModal.show(this.lastPaymentData, carData);
        }, 800);
      }
    );
  }

  handleReset() {
    if (this.scene.cleaner) {
      this.scene.cleaner.setState('idle');
    }
    const carData = this.scene.loadCar(this.scene.currentCarIndex);
    this.hud.updateCarInfo(carData);
    this.hud.updateDirtStatus(1.0);
    this.hud.setWashingState(false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.scene.render();
  }
}

// Bootstrap once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
