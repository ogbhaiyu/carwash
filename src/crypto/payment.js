import QRCode from 'qrcode';
import { WALLET_CONFIG, WASH_PACKAGES } from './config.js';
import { soundEngine } from '../audio/soundEngine.js';

export class PaymentModal {
  constructor(onPaymentVerified) {
    this.onPaymentVerified = onPaymentVerified;
    this.selectedCrypto = 'ETH';
    this.selectedPackage = WASH_PACKAGES[1]; // Series A default
    this.modalEl = null;

    this.createModalDOM();
  }

  createModalDOM() {
    const modal = document.createElement('div');
    modal.className = 'crypto-modal-backdrop hidden';
    modal.id = 'cryptoModal';

    modal.innerHTML = `
      <div class="crypto-modal-card">
        <div class="crypto-modal-header">
          <div class="header-tag">⚡ FTX PARKING LOT CURBSIDE CRYPTO</div>
          <button class="close-btn" id="closeModalBtn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="modal-title-row">
            <h2>Pay Bhai via Robinhood Wallet</h2>
            <p class="subtitle">100% on-chain mobile detailing to sponsor an H-1B founder's visa & chai</p>
          </div>

          <!-- Package Selection -->
          <div class="package-selector" id="packageSelector">
            ${WASH_PACKAGES.map(pkg => `
              <div class="package-pill ${pkg.id === this.selectedPackage.id ? 'active' : ''}" data-pkg-id="${pkg.id}">
                <div class="pkg-top">
                  <span class="pkg-name">${pkg.title}</span>
                  <span class="pkg-price">${pkg.priceUsd}</span>
                </div>
                <div class="pkg-desc">${pkg.desc}</div>
              </div>
            `).join('')}
          </div>

          <!-- Crypto Tab Switcher -->
          <div class="crypto-tabs" id="cryptoTabs">
            ${Object.keys(WALLET_CONFIG).map(key => {
              const cfg = WALLET_CONFIG[key];
              return `
                <button class="crypto-tab-btn ${key === this.selectedCrypto ? 'active' : ''}" data-symbol="${key}">
                  <span class="crypto-icon" style="color: ${cfg.color}">${cfg.icon}</span>
                  <span class="crypto-symbol">${key}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Payment Details Box -->
          <div class="payment-details-box">
            <div class="qr-container">
              <canvas id="qrCanvas" class="qr-canvas"></canvas>
              <div class="qr-label">Scan with Robinhood Wallet</div>
            </div>

            <div class="address-details">
              <div class="network-badge" id="networkBadge">
                Network: <strong id="networkName">Ethereum / Arbitrum / Base</strong>
              </div>

              <div class="amount-due-row">
                <span>Amount Due:</span>
                <span class="amount-val" id="amountVal">0.0010 ETH (~$3.50)</span>
              </div>

              <div class="address-input-group">
                <label>Bhai's Robinhood Wallet Address:</label>
                <div class="copy-box">
                  <input type="text" id="walletAddressInput" readonly value="${WALLET_CONFIG.ETH.address}" />
                  <button class="copy-btn" id="copyAddressBtn">
                    <span class="copy-text">Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Verification Action -->
          <div class="verification-card">
            <div class="tx-input-row">
              <input type="text" id="txHashInput" placeholder="Enter Tx Hash or Sender Handle (e.g. 0x... / Robinhood)" />
            </div>
            <button class="pay-confirm-btn" id="confirmPaymentBtn">
              <span class="btn-emoji">💸</span>
              <span class="btn-text">I HAVE SENT THE CRYPTO &rarr; WASH MY CAR</span>
            </button>
            <div class="security-note">
              <span>🔒 Direct P2P to Robinhood Wallet. No middleman. Bhai will start dancing immediately.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Close button
    this.modalEl.querySelector('#closeModalBtn').addEventListener('click', () => {
      this.hide();
    });

    // Close on clicking backdrop
    this.modalEl.addEventListener('click', e => {
      if (e.target === this.modalEl) {
        this.hide();
      }
    });

    // Package Selection
    const pkgPills = this.modalEl.querySelectorAll('.package-pill');
    pkgPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const pkgId = pill.getAttribute('data-pkg-id');
        this.selectedPackage = WASH_PACKAGES.find(p => p.id === pkgId) || WASH_PACKAGES[0];
        pkgPills.forEach(p => p.classList.toggle('active', p === pill));
        this.updateUI();
      });
    });

    // Crypto Tabs
    const tabs = this.modalEl.querySelectorAll('.crypto-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const symbol = tab.getAttribute('data-symbol');
        this.selectedCrypto = symbol;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        this.updateUI();
      });
    });

    // Copy Address Button
    const copyBtn = this.modalEl.querySelector('#copyAddressBtn');
    copyBtn.addEventListener('click', () => {
      const addrInput = this.modalEl.querySelector('#walletAddressInput');
      navigator.clipboard.writeText(addrInput.value).then(() => {
        const copyText = copyBtn.querySelector('.copy-text');
        copyText.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyText.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2200);
      });
    });

    // Confirm Payment & Trigger Wash
    const confirmBtn = this.modalEl.querySelector('#confirmPaymentBtn');
    confirmBtn.addEventListener('click', () => {
      const txInput = this.modalEl.querySelector('#txHashInput').value.trim();
      const txId = txInput || ('0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));

      // Play Robinhood cash register sound
      soundEngine.playCashRegister();

      this.hide();

      if (this.onPaymentVerified) {
        this.onPaymentVerified({
          package: this.selectedPackage,
          crypto: this.selectedCrypto,
          amount: this.selectedPackage.cryptoAmounts[this.selectedCrypto],
          txId: txId,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });
  }

  updateUI() {
    const config = WALLET_CONFIG[this.selectedCrypto];
    const addrInput = this.modalEl.querySelector('#walletAddressInput');
    const netName = this.modalEl.querySelector('#networkName');
    const amountVal = this.modalEl.querySelector('#amountVal');
    const qrCanvas = this.modalEl.querySelector('#qrCanvas');

    addrInput.value = config.address;
    netName.textContent = config.network;
    amountVal.textContent = `${this.selectedPackage.cryptoAmounts[this.selectedCrypto]} (${this.selectedPackage.priceUsd})`;

    // Generate Scannable QR Code - raw clean address for 100% wallet & scanner compatibility (no solana: or ethereum: prefix)
    const qrData = config.address;

    QRCode.toCanvas(qrCanvas, qrData, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, err => {
      if (err) console.error('QR code render error', err);
    });
  }

  show(packageId = 'series-a') {
    const pkg = WASH_PACKAGES.find(p => p.id === packageId);
    if (pkg) this.selectedPackage = pkg;
    this.updateUI();
    this.modalEl.classList.remove('hidden');
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }
}
