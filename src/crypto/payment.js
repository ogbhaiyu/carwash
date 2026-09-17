import QRCode from 'qrcode';
import { WALLET_CONFIG, WASH_PACKAGES } from './config.js';
import { soundEngine } from '../audio/soundEngine.js';
import { verifyOnChainPayment } from './verifier.js';

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
              <input type="text" id="txHashInput" placeholder="Enter Transaction ID / Hash" />
            </div>
            <div id="verifyAlertContainer"></div>
            <button class="pay-confirm-btn" id="confirmPaymentBtn">
              <span class="btn-emoji">🔍</span>
              <span class="btn-text">VERIFY ON-CHAIN & WASH CAR</span>
            </button>
            <div class="security-note">
              <span>🔒 100% Real On-Chain RPC Check. Funds must be verified on public blockchain before washing begins.</span>
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

    // Confirm Payment & Trigger Wash with Live On-Chain Verification
    const confirmBtn = this.modalEl.querySelector('#confirmPaymentBtn');
    confirmBtn.addEventListener('click', async () => {
      const alertContainer = this.modalEl.querySelector('#verifyAlertContainer');
      const txInput = this.modalEl.querySelector('#txHashInput');
      const txHash = txInput.value.trim();
      const btnText = confirmBtn.querySelector('.btn-text');
      const btnEmoji = confirmBtn.querySelector('.btn-emoji');

      alertContainer.innerHTML = '';

      if (!txHash) {
        alertContainer.innerHTML = `
          <div class="verify-error-banner">
            <span>⚠️</span>
            <div><strong>Transaction Hash Required:</strong> Please send the crypto to Bhai's Robinhood address above, then paste your transaction hash/ID to verify on-chain!</div>
          </div>
        `;
        txInput.focus();
        return;
      }

      // Enter loading state
      confirmBtn.disabled = true;
      txInput.disabled = true;
      confirmBtn.classList.add('verifying');
      btnEmoji.textContent = '⏳';
      btnText.textContent = `VERIFYING ON ${this.selectedCrypto} BLOCKCHAIN...`;

      alertContainer.innerHTML = `
        <div class="verify-status-banner">
          <span>📡</span>
          <div>Connecting to ${this.selectedCrypto} public RPC nodes... verifying confirmation, recipient & amount.</div>
        </div>
      `;

      try {
        const verifyResult = await verifyOnChainPayment(this.selectedCrypto, txHash, this.selectedPackage);

        if (!verifyResult.success) {
          // Failure
          confirmBtn.disabled = false;
          txInput.disabled = false;
          confirmBtn.classList.remove('verifying');
          btnEmoji.textContent = '🔍';
          btnText.textContent = 'VERIFY ON-CHAIN & WASH CAR';

          alertContainer.innerHTML = `
            <div class="verify-error-banner">
              <span>❌</span>
              <div><strong>Verification Failed:</strong> ${verifyResult.error}</div>
            </div>
          `;
          return;
        }

        // Success!
        confirmBtn.classList.remove('verifying');
        confirmBtn.classList.add('verified');
        btnEmoji.textContent = '✅';
        btnText.textContent = `CONFIRMED! ${verifyResult.amountReceived} RECEIVED`;

        alertContainer.innerHTML = `
          <div class="verify-status-banner" style="color: #4ade80; border-color: rgba(74, 222, 128, 0.4); background: rgba(74, 222, 128, 0.1);">
            <span>🎉</span>
            <div><strong>Payment Confirmed On-Chain!</strong> Starting Bhai's detailing sequence...</div>
          </div>
        `;

        soundEngine.playCashRegister();

        setTimeout(() => {
          this.hide();
          confirmBtn.disabled = false;
          txInput.disabled = false;
          confirmBtn.classList.remove('verified');
          btnEmoji.textContent = '🔍';
          btnText.textContent = 'VERIFY ON-CHAIN & WASH CAR';
          alertContainer.innerHTML = '';
          txInput.value = '';

          if (this.onPaymentVerified) {
            this.onPaymentVerified({
              package: this.selectedPackage,
              crypto: this.selectedCrypto,
              amount: verifyResult.amountReceived || this.selectedPackage.cryptoAmounts[this.selectedCrypto],
              txId: verifyResult.txId,
              explorerUrl: verifyResult.explorerUrl,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        }, 1200);

      } catch (err) {
        confirmBtn.disabled = false;
        txInput.disabled = false;
        confirmBtn.classList.remove('verifying');
        btnEmoji.textContent = '🔍';
        btnText.textContent = 'VERIFY ON-CHAIN & WASH CAR';

        alertContainer.innerHTML = `
          <div class="verify-error-banner">
            <span>⚠️</span>
            <div><strong>Network Query Error:</strong> ${err.message}. Please verify your connection or try again.</div>
          </div>
        `;
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

    const txInput = this.modalEl.querySelector('#txHashInput');
    const alertContainer = this.modalEl.querySelector('#verifyAlertContainer');
    if (alertContainer) alertContainer.innerHTML = '';

    const placeholders = {
      SOL: 'Paste 88-char Solana Signature (from Phantom / Robinhood)',
      ETH: 'Paste 66-char Ethereum Tx Hash (0x... from MetaMask / Robinhood)',
      BTC: 'Paste 64-char Bitcoin Tx ID (from Robinhood / wallet)',
      DOGE: 'Paste 64-char Dogecoin Tx ID (from Robinhood / wallet)'
    };
    if (txInput) txInput.placeholder = placeholders[this.selectedCrypto] || 'Enter Transaction ID / Hash';

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
