/**
 * crypto-card — Home Assistant Lovelace custom card
 * Candlestick chart via Binance API (BTC/ETH)
 */

const THEMES = {
  dark: {
    bg: 'linear-gradient(160deg, #0a0f1a 0%, #0a0a0f 100%)',
    border: 'rgba(255,255,255,0.05)',
    text: 'rgba(255,255,255,0.87)',
    muted: 'rgba(255,255,255,0.4)',
    mutedMore: 'rgba(255,255,255,0.25)',
    tabActive: '#4fc3f7',
    tabActiveFg: '#000',
    btnActive: 'rgba(79,195,247,0.15)',
    btnActiveFg: '#4fc3f7',
    btnActiveBorder: '#4fc3f7',
    gridLine: 'rgba(255,255,255,0.05)',
    gridLabel: 'rgba(84,110,122,0.9)',
    lastLine: 'rgba(79,195,247,0.5)',
    green: '#69f0ae',
    red: '#ff5252',
  },
  light: {
    bg: '#ffffff',
    border: 'rgba(0,0,0,0.07)',
    text: 'rgba(0,0,0,0.87)',
    muted: 'rgba(0,0,0,0.4)',
    mutedMore: 'rgba(0,0,0,0.25)',
    tabActive: '#0288d1',
    tabActiveFg: '#fff',
    btnActive: 'rgba(2,136,209,0.12)',
    btnActiveFg: '#0288d1',
    btnActiveBorder: '#0288d1',
    gridLine: 'rgba(0,0,0,0.06)',
    gridLabel: 'rgba(80,100,110,0.9)',
    lastLine: 'rgba(2,136,209,0.5)',
    green: '#2e7d32',
    red: '#c62828',
  },
};

class CryptoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._coin = 'BTC';
    this._interval = '4h';
    this._bars = 60;
    this._timer = null;
    this._darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._theme = this._darkQuery.matches ? THEMES.dark : THEMES.light;
    this._darkQuery.addEventListener('change', e => {
      this._theme = e.matches ? THEMES.dark : THEMES.light;
      this._applyTheme();
      if (this._lastCandles) this._drawCandlesticks(this._lastCandles);
    });
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

  _applyTheme() {
    const t = this._theme;
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;
    card.style.background = t.bg;
    card.style.color = t.text;
    this.shadowRoot.querySelector('.header').style.borderBottomColor = t.border;
    this.shadowRoot.querySelector('.controls').style.borderTopColor = t.border;
    this.shadowRoot.querySelectorAll('.tab').forEach(el => {
      const active = el.classList.contains('active');
      el.style.background = active ? t.tabActive : 'transparent';
      el.style.color = active ? t.tabActiveFg : t.muted;
      el.style.borderColor = active ? t.tabActive : t.border;
    });
    this.shadowRoot.querySelectorAll('.ctrl-btn').forEach(el => {
      const active = el.classList.contains('active');
      el.style.background = active ? t.btnActive : 'transparent';
      el.style.color = active ? t.btnActiveFg : t.muted;
      el.style.borderColor = active ? t.btnActiveBorder : t.border;
    });
    this.shadowRoot.querySelectorAll('.ctrl-label').forEach(el => el.style.color = t.muted);
    const upd = this.shadowRoot.getElementById('updated');
    if (upd) upd.style.color = t.mutedMore;
    const price = this.shadowRoot.getElementById('price');
    if (price) price.style.color = t.text;
  }

  _render() {
    const t = this._theme;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: ${t.bg};
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
          color: ${t.text};
          user-select: none;
          transition: background 0.3s, color 0.3s;
        }
        .header {
          display: flex;
          align-items: center;
          padding: 8px 12px 6px;
          gap: 8px;
          height: 42px;
          box-sizing: border-box;
          border-bottom: 1px solid ${t.border};
        }
        .tabs { display: flex; gap: 6px; }
        .tab {
          padding: 3px 12px;
          border-radius: 6px;
          border: 1px solid ${t.border};
          font-size: 12px;
          font-weight: 600;
          color: ${t.muted};
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .tab.active {
          background: ${t.tabActive};
          color: ${t.tabActiveFg};
          border-color: ${t.tabActive};
        }
        .price-info { flex: 1; text-align: right; }
        .price {
          font-size: 20px;
          font-weight: 200;
          color: ${t.text};
        }
        .change { font-size: 12px; margin-left: 6px; font-weight: 500; }
        .change.pos { color: ${t.green}; }
        .change.neg { color: ${t.red}; }
        canvas { display: block; width: 100%; }
        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 12px 7px;
          border-top: 1px solid ${t.border};
        }
        .ctrl-group { display: flex; gap: 4px; align-items: center; }
        .ctrl-label {
          font-size: 9px;
          color: ${t.muted};
          margin-right: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .ctrl-btn {
          padding: 3px 8px;
          border-radius: 5px;
          border: 1px solid ${t.border};
          font-size: 11px;
          color: ${t.muted};
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .ctrl-btn.active {
          background: ${t.btnActive};
          color: ${t.btnActiveFg};
          border-color: ${t.btnActiveBorder};
        }
        .updated { font-size: 10px; color: ${t.mutedMore}; }
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
      this._lastCandles = candles;
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

    const t = this._theme;

    // Grid
    ctx.strokeStyle = t.gridLine;
    ctx.lineWidth = 1;
    ctx.font = '9px system-ui';
    ctx.fillStyle = t.gridLabel;
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
      const color = isUp ? t.green : t.red;
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
    ctx.strokeStyle = t.lastLine;
    ctx.beginPath();
    ctx.moveTo(PAD_L, ly);
    ctx.lineTo(W - PAD_R + 4, ly);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

customElements.define('crypto-card', CryptoCard);
