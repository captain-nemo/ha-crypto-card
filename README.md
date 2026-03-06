# Crypto Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub release](https://img.shields.io/github/release/captain-nemo/ha-crypto-card.svg)](https://github.com/captain-nemo/ha-crypto-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A custom Lovelace card for Home Assistant that displays real-time **Bitcoin** and **Ethereum** candlestick charts powered by the Binance public API. No API key or account required.

![Preview](preview.jpg)

---

## Features

- 📈 **Candlestick chart** — clean OHLC visualization via the Binance public API
- ₿ **BTC & ETH tabs** — switch between coins with a single tap
- 💹 **Live price + % change** — color-coded green/red at a glance
- ⏱ **Configurable intervals** — 1h, 4h, or 1d candles
- 🕯 **Configurable bar count** — 30, 60, or 90 candles
- 🔄 **Auto-refresh** every 60 seconds
- 🌙 **Dark mode ready** — fits seamlessly into Home Assistant's dark theme
- 🔑 **No API key needed** — uses Binance's public endpoints

---

## Installation via HACS (recommended)

1. Open **HACS** in Home Assistant
2. Go to **Frontend**
3. Click **⋮ → Custom repositories**
4. Add: `https://github.com/captain-nemo/ha-crypto-card`  
   Category: **Lovelace**
5. Search for **"Crypto Card"** and install
6. Restart Home Assistant and clear your browser cache

---

## Manual Installation

1. Download [`crypto-card.js`](https://github.com/captain-nemo/ha-crypto-card/raw/main/crypto-card.js)
2. Copy it to `/config/www/crypto-card.js`
3. Go to **Settings → Dashboards → ⋮ → Resources**
4. Add `/local/crypto-card.js` as a **JavaScript module**

---

## Configuration

Minimal — just drop it into your dashboard:

```yaml
type: custom:crypto-card
```

Full options:

```yaml
type: custom:crypto-card
coin: ETH      # BTC or ETH (default: BTC)
interval: 1d   # 1h | 4h | 1d (default: 4h)
bars: 90       # 30 | 60 | 90 (default: 60)
```

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `coin` | `BTC`, `ETH` | `BTC` | Which cryptocurrency to display |
| `interval` | `1h`, `4h`, `1d` | `4h` | Candlestick interval |
| `bars` | `30`, `60`, `90` | `60` | Number of candles to display |

---

## Data Source

All price data comes from the **[Binance public API](https://api.binance.com)** — no account, no API key, no rate limiting concerns for personal use.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## License

[MIT](LICENSE)
