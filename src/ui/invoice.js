import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/soundEngine.js';

export class InvoiceModal {
  constructor(onReset, onTip) {
    this.onReset = onReset;
    this.onTip = onTip;
    this.modalEl = null;

    this.createDOM();
  }

  createDOM() {
    const modal = document.createElement('div');
    modal.className = 'invoice-modal-backdrop hidden';
    modal.id = 'invoiceModal';

    modal.innerHTML = `
      <div class="invoice-card">
        <button class="close-btn" id="closeInvoiceBtn">&times;</button>
        <div class="invoice-stamp">PAID ON-CHAIN 💸</div>
        <div class="invoice-header">
          <div class="company-brand">
            <span class="brand-logo">🧼</span>
            <div>
              <h3>BHAI'S FTX PARKING LOT AUTO SPA</h3>
              <p>Guerrilla On-Chain Detailing outside FTX HQ, Bahamas</p>
            </div>
          </div>
          <div class="invoice-meta">
            <span class="inv-badge">100% SQUEAKY CLEAN</span>
            <span class="inv-date" id="invDate">DATE: TODAY</span>
          </div>
        </div>

        <div class="invoice-divider"></div>

        <div class="invoice-details-grid">
          <div class="detail-item">
            <label>CLIENT:</label>
            <span>Managing Partner / Tech Bro</span>
          </div>
          <div class="detail-item">
            <label>VEHICLE:</label>
            <span id="invCarName">VC's Tesla Model Y</span>
          </div>
          <div class="detail-item">
            <label>LICENSE PLATE:</label>
            <span id="invPlate" class="highlight-plate">AI-CHAD</span>
          </div>
          <div class="detail-item">
            <label>CLEANED BY:</label>
            <span>Bhai (10x Mobile Detailer & Ex-Founder)</span>
          </div>
        </div>

        <div class="invoice-table">
          <div class="inv-row inv-head">
            <span>SERVICE ITEM</span>
            <span>STATUS</span>
            <span>PRICE</span>
          </div>
          <div class="inv-row">
            <span>High-Pressure Full-Stack Foam Cannon Blast</span>
            <span class="status-ok">✓ APPLIED</span>
            <span id="invBasePrice">$3.50</span>
          </div>
          <div class="inv-row">
            <span>Aggressive Bhangra Rim & Hood Scrub (Vim Bar)</span>
            <span class="status-ok">✓ 138 BPM</span>
            <span>INCLUDED</span>
          </div>
          <div class="inv-row">
            <span>Desi Mogra / Jasmine Air Freshener (Kills Vape Odor)</span>
            <span class="status-ok">✓ COMPLIMENTARY</span>
            <span>$0.00</span>
          </div>
          <div class="inv-row">
            <span>Evil-Eye (Nimbu-Mirchi) Bumper Crash Protection</span>
            <span class="status-ok">✓ BLESSED</span>
            <span>$0.00</span>
          </div>
          <div class="inv-row total-row">
            <span>TOTAL AMOUNT PAID (ROBINHOOD WALLET)</span>
            <span></span>
            <span class="total-val" id="invTotal">$3.50</span>
          </div>
        </div>

        <div class="quote-bubble">
          <span class="quote-avatar">🧔🏽‍♂️</span>
          <div class="quote-text">
            <em>"Thank you, Sahib! Your car now possesses 10x aerodynamic efficiency. If any Andreessen Horowitz partner asks, tell them I am accepting Series A term sheets."</em>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="invoice-actions">
          <button class="tip-chai-btn" id="tipBhaiBtn">
            <span class="btn-icon">☕</span>
            <div class="btn-info">
              <span class="primary-txt">Tip Bhai a Cutting Chai</span>
              <span class="sub-txt">Send extra crypto to his Robinhood Wallet</span>
            </div>
          </button>

          <button class="share-x-btn" id="shareXBtn">
            <svg class="x-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Share to X (Twitter)</span>
          </button>

          <button class="reset-btn" id="washAnotherBtn">
            <span>🔄 Wash Another Tech Ride</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    this.bindEvents();
  }

  bindEvents() {
    // Close on backdrop click (keeps car clean for viewing)
    this.modalEl.addEventListener('click', e => {
      if (e.target === this.modalEl) {
        this.hide();
      }
    });

    // Close button (keeps car clean for viewing)
    this.modalEl.querySelector('#closeInvoiceBtn').addEventListener('click', () => {
      this.hide();
    });

    // Close on Escape key
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.modalEl.classList.contains('hidden')) {
        this.hide();
      }
    });

    // Tip Bhai
    this.modalEl.querySelector('#tipBhaiBtn').addEventListener('click', () => {
      if (this.onTip) this.onTip();
    });

    // Share to X
    this.modalEl.querySelector('#shareXBtn').addEventListener('click', () => {
      const carName = this.modalEl.querySelector('#invCarName').textContent;
      const text = encodeURIComponent(
        `Just had my ${carName} hand-washed in the FTX parking lot by an Indian founder who pivoted to on-chain mobile detailing after his startup imploded 🧽🚗💨\n\nBhai did full Bhangra while scrubbing my rims with a Vim bar. SBF's old parking spot.\n\nPay him crypto to wash yours:`
      );
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });

    // Wash Another (explicitly resets and loads a fresh dirty car)
    this.modalEl.querySelector('#washAnotherBtn').addEventListener('click', () => {
      this.hide();
      if (this.onReset) this.onReset();
    });
  }

  show(paymentData, carData) {
    this.modalEl.querySelector('#invDate').textContent = `DATE: ${new Date().toLocaleDateString()} ${paymentData.timestamp}`;
    this.modalEl.querySelector('#invCarName').textContent = carData.name;
    this.modalEl.querySelector('#invPlate').textContent = carData.plate;
    this.modalEl.querySelector('#invBasePrice').textContent = `${paymentData.package.priceUsd} (${paymentData.amount})`;
    this.modalEl.querySelector('#invTotal').textContent = `${paymentData.package.priceUsd} (${paymentData.amount})`;

    this.modalEl.classList.remove('hidden');

    // Confetti explosion!
    soundEngine.playSparkleShine();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00f2fe', '#ffd700', '#ff5500', '#ffffff']
    });
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }
}
