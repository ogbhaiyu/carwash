// Verified Robinhood Wallet Addresses supplied by user
export const WALLET_CONFIG = {
  ETH: {
    name: 'Ethereum (ETH)',
    symbol: 'ETH',
    network: 'Ethereum / Arbitrum / Base / Polygon',
    address: '0x525e1d9169ece22b6fefe2fb78bcd499d1973a24',
    icon: '⟠',
    color: '#627eea',
    rateLabel: '0.001 ETH (~$3.50)'
  },
  SOL: {
    name: 'Solana (SOL)',
    symbol: 'SOL',
    network: 'Solana Mainnet',
    address: 'J5NPzq9BGFjZbPSkKd1f49fQthQseziDSYX4P9QTw2nc',
    icon: '◎',
    color: '#14f195',
    rateLabel: '0.025 SOL (~$3.50)'
  },
  BTC: {
    name: 'Bitcoin (BTC)',
    symbol: 'BTC',
    network: 'Bitcoin Native SegWit',
    address: 'bc1qmq4eq4nye4u6qmlpxxa0x24jm24yp8w3tq2c97',
    icon: '₿',
    color: '#f7931a',
    rateLabel: '0.00005 BTC (~$3.50)'
  },
  DOGE: {
    name: 'Dogecoin (DOGE)',
    symbol: 'DOGE',
    network: 'Dogecoin Network',
    address: 'DNe8uC5CijRdRjmpZQD8fT3EVJSmdbDDTj',
    icon: 'Ð',
    color: '#c2a633',
    rateLabel: '25 DOGE (~$3.50)'
  }
};

export const WASH_PACKAGES = [
  {
    id: 'seed',
    title: 'Seed Round Splash',
    desc: 'Quick bucket rinse + windshield wipe before your pitch meeting',
    priceUsd: '$1.50',
    cryptoAmounts: {
      ETH: '0.00045 ETH',
      SOL: '0.012 SOL',
      BTC: '0.000022 BTC',
      DOGE: '12 DOGE'
    },
    numericAmounts: {
      ETH: 0.00045,
      SOL: 0.012,
      BTC: 0.000022,
      DOGE: 12
    },
    popular: false
  },
  {
    id: 'series-a',
    title: 'Series A Deep Foam',
    desc: 'High-pressure foam cannon + rims scrub + Desi Bhangra treatment',
    priceUsd: '$3.50',
    cryptoAmounts: {
      ETH: '0.0010 ETH',
      SOL: '0.025 SOL',
      BTC: '0.000050 BTC',
      DOGE: '25 DOGE'
    },
    numericAmounts: {
      ETH: 0.0010,
      SOL: 0.025,
      BTC: 0.000050,
      DOGE: 25
    },
    popular: true
  },
  {
    id: 'ipo',
    title: 'IPO Maharaja Shinemax',
    desc: 'Full ceramic shine + bumper Nimbu-Mirchi evil eye ward + Chai bonus',
    priceUsd: '$8.00',
    cryptoAmounts: {
      ETH: '0.0025 ETH',
      SOL: '0.060 SOL',
      BTC: '0.000120 BTC',
      DOGE: '60 DOGE'
    },
    numericAmounts: {
      ETH: 0.0025,
      SOL: 0.060,
      BTC: 0.000120,
      DOGE: 60
    },
    popular: false
  }
];
