/**
 * crypto-card — Home Assistant Lovelace custom card
 * Candlestick chart via Binance API
 * @version 2.1.0
 */

const COIN_SYMBOLS = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: 'BNB', XRP: 'XRP',
  ADA: '₳', DOGE: 'Ð', AVAX: 'AVAX', DOT: 'DOT', LINK: 'LINK',
  UNI: '🦄', ATOM: 'ATOM', LTC: 'Ł', BCH: 'BCH', NEAR: 'NEAR',
};

const QUOTE_PREFIX = { USDT: '$', USDC: '$', EUR: '€', BTC: '₿', ETH: 'Ξ' };

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

// ─── Editor ──────────────────────────────────────────────────────────────────

class CryptoCardEditor extends HTMLElement {
  static get properties() { return { hass: {}, _config: {} }; }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  get _schema() {
    return [
      {
        name: 'coins',
        label: 'Coins',
        selector: {
          select: {
            multiple: true,
            options: ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','DOT','LINK','UNI','ATOM','LTC','BCH','NEAR','APT','ARB','OP','SUI','PEPE','SHIB'],
          },
        },
      },
      {
        name: 'quote',
        label: 'Quote currency',
        selector: { select: { options: ['USDT', 'EUR', 'USDC'] } },
      },
      {
        name: 'interval',
        label: 'Default interval',
        selector: {
          select: {
            options: ['1m','5m','15m','30m','1h','2h','4h','8h','12h','1d','3d','1w','1M'],
          },
        },
      },
      {
        name: 'interval_buttons',
        label: 'Interval buttons',
        selector: {
          select: {
            multiple: true,
            options: ['1m','5m','15m','30m','1h','2h','4h','8h','12h','1d','3d','1w','1M'],
          },
        },
      },
      {
        name: 'bars',
        label: 'Default number of bars',
        selector: { number: { min: 10, max: 200, step: 10 } },
      },
      {
        name: 'bars_buttons',
        label: 'Bar count buttons',
        selector: {
          select: {
            multiple: true,
            options: ['10','20','30','50','60','90','100','120','150','200'],
          },
        },
      },
      {
        name: 'show_volume',
        label: 'Show volume bars',
        selector: { boolean: {} },
      },
      {
        name: 'refresh',
        label: 'Auto-refresh (seconds, 0 = off)',
        selector: { number: { min: 0, max: 3600, step: 30 } },
      },
      {
        name: 'title',
        label: 'Card title (optional)',
        selector: { text: {} },
      },
    ];
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `<ha-form></ha-form>`;
    const form = this.shadowRoot.querySelector('ha-form');
    form.schema = this._schema;
    form.data = {
      coins: this._config.coins || ['BTC', 'ETH'],
      quote: this._config.quote || 'USDT',
      interval: this._config.interval || '4h',
      interval_buttons: this._config.interval_buttons || ['1h','4h','1d'],
      bars: this._config.bars || 60,
      bars_buttons: (this._config.bars_buttons || [30,60,90]).map(String),
      show_volume: this._config.show_volume || false,
      refresh: this._config.refresh !== undefined ? this._config.refresh : 60,      title: this._config.title || '',
    };
    form.hass = this.hass;

    form.addEventListener('value-changed', (e) => {
      const d = e.detail.value;
      const newConfig = {
        ...this._config,
        coins: Array.isArray(d.coins) ? d.coins : ['BTC', 'ETH'],
        quote: d.quote,
        interval: d.interval,
        interval_buttons: Array.isArray(d.interval_buttons) ? d.interval_buttons : ['1h','4h','1d'],
        bars: d.bars,
        bars_buttons: Array.isArray(d.bars_buttons) ? d.bars_buttons.map(Number) : [30,60,90],
        show_volume: d.show_volume,
        refresh: d.refresh,
      };      if (d.title) newConfig.title = d.title;
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

customElements.define('crypto-card-editor', CryptoCardEditor);

// ─── Card ─────────────────────────────────────────────────────────────────────

class CryptoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._coins = ['BTC', 'ETH'];
    this._coin = 'BTC';
    this._quote = 'USDT';
    this._interval = '4h';
    this._bars = 60;
    this._intervalButtons = ['1h','4h','1d'];
    this._barsButtons = [30,60,90];
    this._showVolume = false;
    this._refresh = 60;
    this._title = null;
    this._timer = null;
    this._darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._theme = this._darkQuery.matches ? THEMES.dark : THEMES.light;
    this._darkQuery.addEventListener('change', e => {
      this._theme = e.matches ? THEMES.dark : THEMES.light;
      this._applyTheme();
      if (this._lastCandles) this._drawChart(this._lastCandles);
    });
  }

  static getConfigElement() { return document.createElement('crypto-card-editor'); }

  static getStubConfig() {
    return { coins: ['BTC', 'ETH'], quote: 'USDT', interval: '4h', interval_buttons: ['1h','4h','1d'], bars: 60, bars_buttons: [30,60,90] };
  }

  setConfig(config) {
    this._config = config;
    this._coins = Array.isArray(config.coins) ? config.coins.map(c => c.toUpperCase())
                  : typeof config.coins === 'string' ? config.coins.split(',').map(s => s.trim().toUpperCase())
                  : ['BTC', 'ETH'];
    // Legacy single-coin config
    if (this._coins.length === 0 && config.coin) this._coins = [config.coin];
    if (this._coins.length === 0) this._coins = ['BTC', 'ETH'];
    this._coin = this._coins[0];
    this._quote = config.quote || 'USDT';
    this._interval = config.interval || '4h';
    this._intervalButtons = Array.isArray(config.interval_buttons) ? config.interval_buttons
                            : typeof config.interval_buttons === 'string' ? config.interval_buttons.split(',').map(s => s.trim()).filter(Boolean)
                            : ['1h','4h','1d'];
    this._bars = config.bars || 60;
    this._barsButtons = Array.isArray(config.bars_buttons) ? config.bars_buttons.map(Number)
                        : typeof config.bars_buttons === 'string' ? config.bars_buttons.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                        : [30,60,90];
    // Ensure selected values exist in button sets; fall back to first option
    if (this._intervalButtons.length && !this._intervalButtons.includes(this._interval))
      this._interval = this._intervalButtons[0];
    if (this._barsButtons.length && !this._barsButtons.includes(this._bars))
      this._bars = this._barsButtons[0];
    this._showVolume = config.show_volume || false;
    this._refresh = config.refresh !== undefined ? config.refresh : 60;    this._title = config.title || null;
    this._render();
  }

  set hass(_) {}
  getCardSize() { return 4; }

  connectedCallback() {
    this._fetchCrypto();
    if (this._refresh > 0) {
      this._timer = setInterval(() => this._fetchCrypto(), this._refresh * 1000);
    }
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
  }

  _tabLabel(coin) {
    const sym = COIN_SYMBOLS[coin];
    return sym && sym !== coin ? `${sym} ${coin}` : coin;
  }

  _applyTheme() {
    const t = this._theme;
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;
    card.style.background = t.bg;
    card.style.color = t.text;
    const header = this.shadowRoot.querySelector('.header');
    if (header) header.style.borderBottomColor = t.border;
    const controls = this.shadowRoot.querySelector('.controls');
    if (controls) controls.style.borderTopColor = t.border;
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
  }

  _render() {
    const t = this._theme;
    const intervals = this._intervalButtons;
    const bars = this._barsButtons;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { background: ${t.bg} !important; }
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
          min-height: 42px;
          box-sizing: border-box;
          border-bottom: 1px solid ${t.border};
        }
        .header-left { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .card-title { font-size: 10px; color: ${t.muted}; letter-spacing: 1px; text-transform: uppercase; }
        .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .tab {
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid ${t.border};
          font-size: 12px;
          font-weight: 600;
          color: ${t.muted};
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }
        .tab.active { background: ${t.tabActive}; color: ${t.tabActiveFg}; border-color: ${t.tabActive}; }
        .price-info { text-align: right; white-space: nowrap; }
        .price { font-size: 20px; font-weight: 200; color: ${t.text}; }
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
          flex-wrap: wrap;
          gap: 4px;
        }
        .ctrl-group { display: flex; gap: 4px; align-items: center; }
        .ctrl-label { font-size: 9px; color: ${t.muted}; margin-right: 2px; letter-spacing: 1px; text-transform: uppercase; }
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
        .ctrl-btn.active { background: ${t.btnActive}; color: ${t.btnActiveFg}; border-color: ${t.btnActiveBorder}; }
        .updated { font-size: 10px; color: ${t.mutedMore}; }
      </style>
      <ha-card>
        <div class="card">
          <div class="header">
            <div class="header-left">
              ${this._title ? `<div class="card-title">${this._title}</div>` : ''}
              <div class="tabs">
                ${this._coins.map(c => `
                  <div class="tab ${c === this._coin ? 'active' : ''}" data-coin="${c}">${this._tabLabel(c)}</div>
                `).join('')}
              </div>
            </div>
            <div class="price-info">
              <span class="price" id="price">--</span>
              <span class="change pos" id="change">--%</span>
            </div>
          </div>
          <canvas id="chart" height="${this._showVolume ? 220 : 200}"></canvas>
          <div class="controls">
            <div class="ctrl-group">
              <span class="ctrl-label">Interval</span>
              ${intervals.map(iv => `
                <div class="ctrl-btn ${this._interval === iv ? 'active' : ''}" data-interval="${iv}">${iv}</div>
              `).join('')}
            </div>
            <div class="ctrl-group">
              <span class="ctrl-label">Bars</span>
              ${bars.map(b => `
                <div class="ctrl-btn ${this._bars === b ? 'active' : ''}" data-bars="${b}">${b}</div>
              `).join('')}
            </div>
            <span class="updated" id="updated">--:--</span>
          </div>
        </div>
      </ha-card>
    `;

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
    const symbol = `${this._coin}${this._quote}`;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${this._interval}&limit=${this._bars}`;
    try {
      const data = await (await fetch(url)).json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      const candles = data.map(k => ({
        o: parseFloat(k[1]), h: parseFloat(k[2]),
        l: parseFloat(k[3]), c: parseFloat(k[4]),
        v: parseFloat(k[5]),
      }));
      const last = candles[candles.length - 1];
      const change = ((last.c - candles[0].o) / candles[0].o) * 100;
      const prefix = QUOTE_PREFIX[this._quote] || '';

      const priceEl = this.shadowRoot.getElementById('price');
      const changeEl = this.shadowRoot.getElementById('change');
      const updatedEl = this.shadowRoot.getElementById('updated');

      if (priceEl) priceEl.textContent = this._fmtPrice(last.c, prefix);
      if (changeEl) {
        changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        changeEl.className = 'change ' + (change >= 0 ? 'pos' : 'neg');
      }
      if (updatedEl) {
        const now = new Date();
        updatedEl.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      }
      this._lastCandles = candles;
      this._drawChart(candles);
    } catch (err) {
      const canvas = this.shadowRoot.getElementById('chart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('API unavailable', canvas.width / 2, canvas.height / 2);
      }
    }
  }

  _fmtPrice(p, prefix = '$') {
    if (p >= 1000) return prefix + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p >= 1)    return prefix + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return prefix + p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  _fmtPriceShort(p, prefix = '$') {
    if (p >= 1000) return prefix + (p / 1000).toFixed(1) + 'k';
    if (p >= 1)    return prefix + p.toFixed(2);
    return prefix + p.toFixed(4);
  }

  _drawChart(candles) {
    const canvas = this.shadowRoot.getElementById('chart');
    if (!canvas) return;

    const W = canvas.offsetWidth || 400;
    const H = this._showVolume ? 220 : 200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!candles.length) return;

    const t = this._theme;
    const prefix = QUOTE_PREFIX[this._quote] || '';
    const bullColor = t.green;
    const bearColor = t.red;

    const VOL_H   = this._showVolume ? Math.floor(H * 0.2) : 0;
    const PAD_L   = 4, PAD_R = 44, PAD_T = 10, PAD_B = 16;
    const chartH  = H - PAD_T - PAD_B - VOL_H;
    const chartW  = W - PAD_L - PAD_R;

    const minP    = Math.min(...candles.map(c => c.l));
    const maxP    = Math.max(...candles.map(c => c.h));
    const range   = maxP - minP || 1;
    const toY     = p => PAD_T + chartH - ((p - minP) / range) * chartH;

    const step    = chartW / candles.length;
    const bodyW   = Math.max(1, Math.floor(step * 0.65));

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
      ctx.fillText(this._fmtPriceShort(maxP - (range / 3) * i, prefix), W - PAD_R + 6, y + 3);
    }

    // Candles
    candles.forEach((c, i) => {
      const cx   = PAD_L + step * i + step / 2;
      const isUp = c.c >= c.o;
      const color = isUp ? bullColor : bearColor;
      const top  = toY(Math.max(c.o, c.c));
      const bot  = toY(Math.min(c.o, c.c));
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

    // Volume bars
    if (this._showVolume && VOL_H > 0) {
      const maxVol = Math.max(...candles.map(c => c.v));
      const volTop = H - PAD_B - VOL_H;
      candles.forEach((c, i) => {
        const cx   = PAD_L + step * i + step / 2;
        const isUp = c.c >= c.o;
        const color = isUp ? bullColor : bearColor;
        const vh   = Math.max(1, (c.v / maxVol) * (VOL_H - 4));
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(cx - bodyW / 2, volTop + VOL_H - vh, bodyW, vh);
      });
      ctx.globalAlpha = 1;
    }
  }
}

customElements.define('crypto-card', CryptoCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'crypto-card',
  name: 'Crypto Card',
  description: 'Candlestick chart card for BTC, ETH and other Binance-listed coins',
  preview: true,
  documentationURL: 'https://github.com/captain-nemo/ha-crypto-card',
});
