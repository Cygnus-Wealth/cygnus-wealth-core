# CygnusWealth

A decentralized, client-side portfolio aggregation and tracking dApp that puts user sovereignty first. Track your crypto assets across multiple chains, DEXs, and CEXs without ever exposing your private keys.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)

## 🚀 Key Features

### 🔐 Privacy-First Architecture
- **100% Client-Side**: All operations run in your browser - no servers, no tracking
- **Read-Only Integrations**: Never handles private keys or signs transactions
- **Local Encryption**: User data encrypted with BIP39-derived keys using Web Crypto API
- **IPFS Storage**: Optional encrypted backup to IPFS for cross-device sync

### 📊 Multi-Platform Portfolio Tracking
- **CEX Integration**: Robinhood, Kraken, Coinbase (read-only API access)
- **Multi-Chain Support**: Ethereum/EVM, Solana, SUI
- **DEX Tracking**: Real-time positions via subgraphs and RPCs
- **Wallet Connections**: MetaMask, Rabby, Phantom, Slush (read-only)
- **Manual Entry**: Support for any platform via encrypted forms

### 📈 Analytics & Visualization
- **Real-Time Dashboard**: Hierarchical views with drill-down capabilities
- **Portfolio Analytics**: Charts, trends, and performance metrics (Recharts)
- **Custom Alerts**: Price movements, portfolio changes
- **Export Options**: CSV, JSON for tax/accounting purposes

### 🔒 Security Features
- **Zero-Knowledge Proofs**: Enhanced privacy with zk.js
- **No Asset Control**: Cannot execute transactions or move funds
- **Encrypted Storage**: All sensitive data encrypted before storage
- **Open Source**: Fully auditable codebase

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **UI Framework**: Chakra UI v3
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Forms**: Formik + Yup
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Animation**: Framer Motion

### Web3 Libraries
- **Ethereum/EVM**: ethers.js, viem/wagmi
- **Solana**: @solana/web3.js
- **SUI**: @mysten/sui.js
- **Encryption**: Web Crypto API + tweetnacl

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm 9+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/cygnus-wealth.git
cd cygnus-wealth/cygnus-wealth-core

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

### Project Structure

```
cygnus-wealth-core/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API integrations, Web3 connections
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions, encryption
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── vite.config.ts      # Vite configuration
└── package.json
```

### Environment Variables

Create a `.env.local` file for development:

```bash
# RPC Endpoints (optional - uses public defaults)
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_SUI_RPC_URL=https://fullnode.mainnet.sui.io

# Subgraph Endpoints (optional)
VITE_UNISWAP_SUBGRAPH=https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
```

## 🚀 Deployment

### IPFS via Fleek

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy to Fleek:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Deploy

### Traditional Hosting

The built files in `dist/` can be served from any static host (Vercel, Netlify, etc.)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Write tests for new features
- Ensure `npm run lint` passes

## 🔒 Security

- **Never commit API keys or secrets**
- All CEX integrations are read-only
- No private key handling in the codebase
- Regular dependency updates
- Security audits planned pre-mainnet

### Reporting Security Issues

Please email security@cygnuswealth.io for security concerns.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React + Vite template
- Chakra UI for the component library
- The Web3 community for inspiration

## 📞 Contact

- Website: [cygnuswealth.io](https://cygnuswealth.io) (coming soon)
- Twitter: [@cygnuswealth](https://twitter.com/cygnuswealth)
- Discord: [Join our community](https://discord.gg/cygnuswealth)

---

**⚠️ Disclaimer**: CygnusWealth is a read-only portfolio tracker. It cannot execute transactions or access your private keys. Always verify data accuracy and never share your private keys with any application.