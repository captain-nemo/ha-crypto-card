/**
 * crypto-card — Home Assistant Lovelace custom card
 * Candlestick chart via Binance API (BTC/ETH)
 */

class CryptoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._coin = 'BTC';
    this._interval = '4h';
    this._bars = 60;
    this._timer = null;
  }

  setConfig(config) {
    this._config = config;
    this._coin = config.coin || 'BTC';
    this._interval = config.interval || '4h';
    this._bars = config.bars || 60;
    this._render();
  }

  set hass(hass) {
    // Card is standalone, no HA entities needed
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    this._fetchCrypto();
    this._timer = setInterval(() => this._fetchCrypto(), 60000);
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: linear-gradient(160deg, #0a0f1a 0%, #0a0a0f 100%);
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
          color: rgba(255,255,255,0.87);
          user-select: none;
        }
        .header {
          display: flex;
          align-items: center;
          padding: 8px 12px 6px;
          gap: 8px;
          height: 42px;
          box-sizing: border-box;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tabs { display: flex; gap: 6px; }
        .tab {
          padding: 3px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .tab.active {
          background: #4fc3f7;
          color: #000;
          border-color: #4fc3f7;
        }
        .price-info {
          flex: 1;
          text-align: right;
        }
        .price {
          font-size: 20px;
          font-weight: 200;
          color: rgba(255,255,255,0.87);
        }
        .change {
          font-size: 12px;
          margin-left: 6px;
          font-weight: 500;
        }
        .change.pos { color: #69f0ae; }
        .change.neg { color: #ff5252; }
        canvas {
          display: block;
          width: 100%;
        }
        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 12px 7px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .ctrl-group { display: flex; gap: 4px; align-items: center; }
        .ctrl-label {
          font-size: 9px;
          color: rgba(255,255,255,0.3);
          margin-right: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .ctrl-btn {
          padding: 3px 8px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .ctrl-btn.active {
          background: rgba(79,195,247,0.15);
          color: #4fc3f7;
          border-color: #4fc3f7;
        }
        .updated {
          font-size: 10px;
          color: rgba(255,255,255,0.25);
        }
        .error-msg {
          text-align: center;
          color: rgba(255,255,255,0.3);
          font-size: 12px;
          padding: 40px 0;
        }
      </style>
      <ha-card>
        <div class="card">
          <div class="header">
            <div class="tabs">
              <div class="tab ${this._coin === 'BTC' ? 'active' : ''}" data-coin="BTC">₿ BTC</div>
              <div class="tab ${this._coin === 'ETH' ? 'active' : ''}\" data-coin="ETH">Ξ ETH</div>
            </div>
            <div class="price-info">
              <span class="price" id="price">$--</span>
              <span class="change pos" id="change">--%</span>
            </div>
          </div>
          <canvas id="chart" height="200"></canvas>
          <div class="controls">
            <div class="ctrl-group">
              <span class="ctrl-label">Interval</span>
              ${['1h','4h','1d'].map(iv => `
                <div class="ctrl-btn ${this._interval === iv ? 'active' : ''}" data-interval="${iv}">${iv}</div>
              `).join('')}
            </div>
            <div class="ctrl-group">
              <span class="ctrl-label">Bars</span>
              ${[30,60,90].map(b => `
                <div class="ctrl-btn ${this._bars === b ? 'active' : ''}" data-bars="${b}">${b}</div>
              `).join('')}
            </div>
            <span class="updated" id="updated">--:--</span>
          </div>
        </div>
      </ha-card>
    `;

    // Event listeners
    this.shadowRoot.querySelectorAll('.tab').forEach(el => {
      el.addEventListener('click', () => {
        this._coin = el.dataset.coin;
        this.shadowRoot.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.coin === this._coin));
        this._fetchCrypto();
      });
    });
    this.shadowRoot.querySelectorAll('[data-interval]').forEach(el => {
      el.addEventListener('click', () => {
        this._interval = el.dataset.interval;
        this.shadowRoot.querySelectorAll('[data-interval]').forEach(b => b.classList.toggle('active', b.dataset.interval === this._interval));
        this._fetchCrypto();
      });
    });
    this.shadowRoot.querySelectorAll('[data-bars]').forEach(el => {
      el.addEventListener('click', () => {
        this._bars = parseInt(el.dataset.bars);
        this.shadowRoot.querySelectorAll('[data-bars]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.bars) === this._bars));
        this._fetchCrypto();
      });
    });
  }

  async _fetchCrypto() {
    const symbols = { BTC: 'BTCUSDT', ETH: 'ETHUSDT' };
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbols[this._coin]}&interval=${this._interval}&limit=${this._bars}`;
    try {
      const data = await (await fetch(url)).json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      const candles = data.map(k => ({
        o: parseFloat(k[1]), h: parseFloat(k[2]),
        l: parseFloat(k[3]), c: parseFloat(k[4])
      }));
      const last = candles[candles.length - 1];
      const change = ((last.c - candles[0].o) / candles[0].o) * 100;

      const priceEl = this.shadowRoot.getElementById('price');
      const changeEl = this.shadowRoot.getElementById('change');
      const updatedEl = this.shadowRoot.getElementById('updated');

      if (priceEl) priceEl.textContent = this._fmtPrice(last.c);
      if (changeEl) {
        changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        changeEl.className = 'change ' + (change >= 0 ? 'pos' : 'neg');
      }
      if (updatedEl) {
        const now = new Date();
        updatedEl.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      }
      this._drawCandlesticks(candles);
    } catch (err) {
      const canvas = this.shadowRoot.getElementById('chart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('API onbereikbaar', canvas.width / 2, canvas.height / 2);
      }
    }
  }

  _fmtPrice(p) {
    return p >= 1000
      ? '$' + p.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
      : '$' + p.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  _fmtPriceShort(p) {
    return p >= 1000 ? '$' + (p / 1000).toFixed(1) + 'k' : '$' + p.toFixed(0);
  }

  _drawCandlesticks(candles) {
    const canvas = this.shadowRoot.getElementById('chart');
    if (!canvas) return;

    const W = canvas.offsetWidth || 400;
    const H = 200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!candles.length) return;

    const PAD_L = 4, PAD_R = 44, PAD_T = 10, PAD_B = 16;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const minP   = Math.min(...candles.map(c => c.l));
    const maxP   = Math.max(...candles.map(c => c.h));
    const range  = maxP - minP || 1;
    const toY    = p => PAD_T + chartH - ((p - minP) / range) * chartH;
    const step   = chartW / candles.length;
    const bodyW  = Math.max(1, Math.floor(step * 0.65));

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.font = '9px system-ui';
    ctx.fillStyle = 'rgba(84,110,122,0.9)';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 3; i++) {
      const y = PAD_T + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R + 4, y);
      ctx.stroke();
      ctx.fillText(this._fmtPriceShort(maxP - (range / 3) * i), W - PAD_R + 6, y + 3);
    }

    // Candles
    candles.forEach((c, i) => {
      const cx    = PAD_L + step * i + step / 2;
      const isUp  = c.c >= c.o;
      const color = isUp ? '#69f0ae' : '#ff5252';
      const top   = toY(Math.max(c.o, c.c));
      const bot   = toY(Math.min(c.o, c.c));
      ctx.fillStyle = ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, toY(c.h));
      ctx.lineTo(cx, toY(c.l));
      ctx.stroke();
      ctx.fillRect(cx - bodyW / 2, top, bodyW, Math.max(1, bot - top));
    });

    // Last price dashed line
    const ly = toY(candles[candles.length - 1].c);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(79,195,247,0.5)';
    ctx.beginPath();
    ctx.moveTo(PAD_L, ly);
    ctx.lineTo(W - PAD_R + 4, ly);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

customElements.define('crypto-card', CryptoCard);
