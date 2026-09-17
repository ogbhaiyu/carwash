export class HUD {
  constructor({ onSelectCar, onHonk, onOpenPay, onToggleAudio, onResetCamera, cars }) {
    this.onSelectCar = onSelectCar;
    this.onHonk = onHonk;
    this.onOpenPay = onOpenPay;
    this.onToggleAudio = onToggleAudio;
    this.onResetCamera = onResetCamera;
    this.cars = cars;
    this.selectedCarIndex = 0;

    this.createHUD();
  }

  createHUD() {
    const hudContainer = document.createElement('div');
    hudContainer.className = 'hud-overlay';
    hudContainer.id = 'hudOverlay';

    hudContainer.innerHTML = `
      <!-- Top Brand Header -->
      <header class="hud-header">
        <div class="brand-badge">
          <div class="brand-icon">🧼</div>
          <div class="brand-titles">
            <span class="brand-main">BHAI'S CRYPTO AUTO SPA</span>
            <span class="brand-sub">📍 Curbside at FTX HQ Parking Lot &bull; Bahamas (Seized)</span>
          </div>
        </div>

        <div class="header-right">
          <div class="hustle-ticker">
            <span class="live-dot"></span>
            <span class="ticker-text">H-1B EXPIRING IN 14 DAYS &bull; PIVOTED TO ON-CHAIN MOBILE DETAILING &bull; ACCEPTING ROBINHOOD WALLET</span>
          </div>

          <button class="icon-btn" id="resetCamBtn" title="Reset Camera to Hero View">
            <span>🎥</span>
          </button>

          <button class="icon-btn" id="audioToggleBtn" title="Toggle Sound & Bhangra Beat">
            <span id="audioIcon">🔊</span>
          </button>
        </div>
      </header>

      <!-- Subtitle & Live Status Banner (Shows during wash) -->
      <div class="wash-status-banner hidden" id="washStatusBanner">
        <div class="status-spinner"></div>
        <div class="status-content">
          <span class="status-phase-title" id="statusPhaseTitle">TURBO FOAM BLAST</span>
          <span class="status-sub-text" id="statusSubText">Applying 10x Full-Stack Detergent to VC whip...</span>
        </div>
      </div>

      <!-- Car Selection Carousel Pills -->
      <div class="car-selector-bar" id="carSelectorBar">
        ${this.cars.map((car, idx) => `
          <button class="car-pill-btn ${idx === 0 ? 'active' : ''}" data-car-idx="${idx}">
            <span class="car-emoji">${car.emoji}</span>
            <span class="car-label">${car.shortName}</span>
          </button>
        `).join('')}
      </div>

      <!-- Bottom Action Bar (Bottom-Right Action Center) -->
      <div class="hud-bottom-bar" id="hudBottomBar">
        <div class="action-center">
          <button class="horn-btn" id="honkBtn" title="Honk Horn">
            <span class="horn-icon">🎺</span>
            <span class="horn-text">HONK HORN</span>
          </button>

          <button class="pay-wash-btn" id="openPayBtn">
            <div class="btn-glow"></div>
            <div class="btn-inner">
              <span class="btn-sparkle">✨</span>
              <div class="btn-copy">
                <span class="cta-primary">PAY WITH CRYPTO &amp; WASH</span>
                <span class="cta-sub">Robinhood Wallet &bull; ETH / SOL / BTC / DOGE (~$3.50)</span>
              </div>
              <span class="arrow-icon">&rarr;</span>
            </div>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(hudContainer);
    this.hudEl = hudContainer;

    this.bindEvents();
  }

  bindEvents() {
    // Car Selector
    const carBtns = this.hudEl.querySelectorAll('.car-pill-btn');
    carBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-car-idx'), 10);
        this.selectedCarIndex = idx;
        carBtns.forEach(b => b.classList.toggle('active', b === btn));
        if (this.onSelectCar) this.onSelectCar(idx);
      });
    });

    // Honk Button
    this.hudEl.querySelector('#honkBtn').addEventListener('click', () => {
      if (this.onHonk) this.onHonk();
    });

    // Pay & Wash Button
    this.hudEl.querySelector('#openPayBtn').addEventListener('click', () => {
      if (this.onOpenPay) this.onOpenPay();
    });

    // Audio Mute Toggle
    const audioBtn = this.hudEl.querySelector('#audioToggleBtn');
    audioBtn.addEventListener('click', () => {
      if (this.onToggleAudio) {
        const isMuted = this.onToggleAudio();
        this.hudEl.querySelector('#audioIcon').textContent = isMuted ? '🔇' : '🔊';
      }
    });

    // Camera Reset Button (Header)
    const resetCamBtn = this.hudEl.querySelector('#resetCamBtn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        if (this.onResetCamera) this.onResetCamera();
      });
    }
  }

  updateCarInfo(carData) {
    const title = this.hudEl.querySelector('#hudCarTitle');
    if (title) title.textContent = carData.name;
    const plate = this.hudEl.querySelector('#hudCarPlate');
    if (plate) plate.textContent = carData.plate;
    const desc = this.hudEl.querySelector('#hudCarDesc');
    if (desc) desc.textContent = carData.desc;
    this.updateDirtStatus(1.0);
  }

  updateDirtStatus(dirtLevel, phase = '') {
    const dirtEl = this.hudEl.querySelector('#hudStatusDirt');
    const scentEl = this.hudEl.querySelector('#hudStatusScent');
    if (!dirtEl || !scentEl) return;

    dirtEl.className = 'chip';

    if (dirtLevel <= 0.02) {
      dirtEl.classList.add('chip-clean');
      dirtEl.textContent = '✨ Status: 0% Spotless (Mirror Finish)';
      scentEl.textContent = '🌸 Scent: Royal Mogra & Jasmine';
      scentEl.classList.add('chip-fresh');
    } else if (phase === 'rinse' || dirtLevel < 0.35) {
      dirtEl.classList.add('chip-rinse');
      dirtEl.textContent = '🌊 Status: 15% Hydro Jet Rinse';
      scentEl.textContent = '🧼 Scent: Fresh Foam Rinse';
      scentEl.classList.remove('chip-fresh');
    } else if (phase === 'scrub' || dirtLevel < 0.75) {
      dirtEl.classList.add('chip-scrub');
      dirtEl.textContent = `🧼 Status: ${Math.round(dirtLevel * 100)}% Vim Bar Scrub`;
      scentEl.textContent = '🍋 Scent: Vim Lemon & Turmeric';
      scentEl.classList.remove('chip-fresh');
    } else if (phase === 'foam' || dirtLevel < 0.95) {
      dirtEl.classList.add('chip-foam');
      dirtEl.textContent = '🫧 Status: 85% Sudsy Detergent';
      scentEl.textContent = '💨 Scent: 10x Detergent Vapor';
      scentEl.classList.remove('chip-fresh');
    } else {
      dirtEl.classList.add('chip-dirt');
      dirtEl.textContent = 'Status: 100% Filthy';
      scentEl.textContent = 'Scent: Stale Tech Vape';
      scentEl.classList.remove('chip-fresh');
    }
  }

  setWashingState(isWashing) {
    const bottomBar = this.hudEl.querySelector('#hudBottomBar');
    const selectorBar = this.hudEl.querySelector('#carSelectorBar');
    const statusBanner = this.hudEl.querySelector('#washStatusBanner');

    if (isWashing) {
      bottomBar.classList.add('fade-out');
      selectorBar.classList.add('fade-out');
      statusBanner.classList.remove('hidden');
    } else {
      bottomBar.classList.remove('fade-out');
      selectorBar.classList.remove('fade-out');
      statusBanner.classList.add('hidden');
    }
  }

  updateWashPhase(phase, text) {
    const titleEl = this.hudEl.querySelector('#statusPhaseTitle');
    const subEl = this.hudEl.querySelector('#statusSubText');

    if (phase === 'foam') {
      titleEl.textContent = '🫧 PHASE 1: GENERATIVE FOAM CANNON';
    } else if (phase === 'scrub') {
      titleEl.textContent = '🕺 PHASE 2: 138 BPM BHANGRA SCRUB (VIM BAR)';
    } else if (phase === 'rinse') {
      titleEl.textContent = '🌊 PHASE 3: HIGH-PRESSURE HYDRO JET RINSE';
    } else if (phase === 'complete') {
      titleEl.textContent = '✨ COMPLETE: 100% SQUEAKY CLEAN';
    }
    subEl.textContent = text;
  }
}
