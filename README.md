# Crypto Card voor Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

Lovelace custom card met candlestick chart voor BTC en ETH via de Binance API. Geen API key nodig.

## Installatie via HACS

1. Open HACS in Home Assistant
2. Ga naar **Frontend**
3. Klik **⋮ → Aangepaste repositories**
4. Voeg toe: `https://github.com/captain-nemo/ha-crypto-card`  
   Categorie: **Lovelace**
5. Zoek "Crypto Card" en installeer
6. Herstart / clear browser cache

## Handmatige installatie

1. Download `crypto-card.js`
2. Kopieer naar `/config/www/crypto-card.js`
3. Ga naar **Instellingen → Dashboards → ⋮ → Resources**
4. Voeg toe: `/local/crypto-card.js` als **JavaScript module**

## Configuratie

Minimaal:
```yaml
type: custom:crypto-card
```

Uitgebreid:
```yaml
type: custom:crypto-card
coin: ETH      # BTC of ETH (standaard: BTC)
interval: 1d   # 1h | 4h | 1d (standaard: 4h)
bars: 90       # 30 | 60 | 90 (standaard: 60)
```

## Features

- 📈 Candlestick chart via Binance API
- ₿ BTC en Ξ ETH tabs
- Huidige prijs + procentuele verandering (groen/rood)
- Instelbaar interval en aantal candles
- Auto-refresh elke 60 seconden
- Dark theme passend bij HA dark mode

## Data

Data afkomstig van de publieke Binance API — geen account of API key nodig.
