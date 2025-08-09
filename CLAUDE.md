# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CygnusWealth Project Overview

CygnusWealth is a decentralized, client-side dApp for portfolio aggregation and tracking, emphasizing user sovereignty, privacy, and read-only integrations without handling private keys or transaction signing. Built as a browser-first application in a single React + TypeScript codebase, it aggregates data from CEXs, DEXs, and multi-chain wallets, with future cross-platform extensions. The design focuses on intuitive, hierarchical UI/UX to provide seamless overviews, drills, and visualizations while reinforcing decentralization through visual cues and local encryption.

### Key Features
- **CEX Integration**: Read-only access to Robinhood, Kraken, and Coinbase via user-provided API keys, fetched client-side with Axios and encrypted locally.
- **DEX and On-Chain Tracking**: Real-time data from subgraphs and RPCs for positions, NFTs, and histories across Ethereum/EVM, Solana, and SUI.
- **Multi-Wallet Support**: Read-only connections to MetaMask/Rabby (EVM), Phantom (Solana), and Slush (SUI) for balance and transaction aggregation; manual inputs for unsupported platforms stored encrypted on IPFS.
- **Usability Enhancements**: Hierarchical dashboard with charts (Recharts), real-time alerts, exports, and progressive disclosure; privacy-forward elements like lock icons and ZK proofs.
- **Decentralization & Security**: All operations in-browser, using Web Crypto API + tweetnacl for encryption via BIP39-derived keys; no servers, deployed on IPFS via Fleek.
- **Monetization Potential**: Freemium model with optional premium features like advanced analytics.

### Technology Stack
- **Frontend Framework**: React + TypeScript with Chakra UI and React Router.
- **State & Data**: Zustand for management; Axios for APIs; ethers.js, viem/wagmi, @solana/web3.js, @mysten/sui.js for Web3 reads.
- **Security & Tools**: Web Crypto API, tweetnacl, zk.js; Formik/Yup for forms; Vitest for testing.
- **Deployment**: IPFS (Fleek); future Capacitor/Tauri for mobile/desktop.
- **UI/UX Elements**: Minimalist layouts, neutral palette, WCAG-compliant accessibility, micro-interactions, and modular screens (onboarding, dashboard, drills).

### Goals & Constraints
Primary goals include secure, effortless multi-chain tracking with high decentralization and extensibility for features like simulations. Constraints encompass browser limitations, RPC reliabilities, audit costs (~$5k-10k), and no server infrastructure, mitigated by client-side focus and modular repositories.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (runs TypeScript compilation then Vite build)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

## Testing

- Uses Vitest as the test runner
- Test environment: jsdom 
- Setup file: `./src/setupTests.ts` (referenced but not yet created)
- Run tests: `vitest` (not explicitly in package.json scripts yet)
- Never complete any task without ensuring tests are passing. 

## Tech Stack & Architecture

This is a decentralized portfolio aggregation and tracking dApp built with React 19 + TypeScript + Vite. The application focuses on read-only integrations without replicating wallet functionality like key management or transaction signing.

## Project Overview

A serverless, client-side dApp for multi-chain portfolio tracking that emphasizes user sovereignty and decentralization. Built from scratch as a single React + TypeScript codebase for cross-platform deployment.

### Key Features
- **CEX Integration**: Client-side API calls to Robinhood, Kraken, and Coinbase using Axios with user-provided keys encrypted locally or on IPFS for read-only access
- **DEX and On-Chain Tracking**: Real-time data via subgraphs and RPCs with viem/wagmi for public queries without wallet replication
- **Multi-Wallet Support**: Read-only connections to MetaMask/Rabby (Ethereum/EVM via ethers.js), Slush (SUI via @mysten/sui.js), and Phantom (Solana via @solana/web3.js) for data aggregation only
- **Manual Platform Support**: Forms with Formik/Yup for unknown platforms with encrypted IPFS storage
- **Privacy & Security**: BIP39 mnemonic derives app-specific keys for data encryption/decryption only (Web Crypto API + tweetnacl), not asset control
- **Analytics**: Real-time alerts and portfolio analytics with Recharts, state managed via Zustand

### Core Dependencies
- **UI Framework**: Chakra UI v3 with Emotion for styling
- **State Management**: Zustand for client state
- **Routing**: React Router DOM v7
- **Forms**: Formik with Yup validation
- **HTTP Client**: Axios for CEX API integration
- **Charts**: Recharts for portfolio analytics
- **Animation**: Framer Motion

### Planned Web3 Libraries
- **Ethereum/EVM**: ethers.js, viem/wagmi for read-only hooks
- **Solana**: @solana/web3.js for read-only data fetching
- **SUI**: @mysten/sui.js for SUI blockchain integration
- **Encryption**: Web Crypto API + tweetnacl for client-side encryption
- **Privacy**: zk.js for zero-knowledge proofs

### Cross-Platform Strategy
- **Mobile**: Capacitor for iOS/Android deployment
- **Desktop**: Tauri for native desktop applications
- **Web**: Standard React deployment with IPFS via Fleek. Support Firefox, Safari and Chromium based browsers. 
- **Monorepo**: TurboRepo/Nx for multi-platform management

### Project Structure
- `src/main.tsx` - Application entry point with React StrictMode
- `src/App.tsx` - Main application component (currently default Vite template)
- `vite.config.ts` - Vite configuration with React plugin and Vitest setup

### Development Notes
- Uses ES modules (`"type": "module"`)
- TypeScript configuration split between `tsconfig.app.json` and `tsconfig.node.json`
- ESLint configured with modern flat config format
- Vite handles HMR and build processes
- Testing configured for jsdom environment but setup file not yet created
- All computations are client-side with no backend dependencies
- Non-custodial approach - no private key handling or transaction signing within the dApp

### Security Principles
- Read-only integrations only to reinforce non-custodial principles
- User-owned data with local/IPFS encryption
- No asset control or transaction signing capabilities
- BIP39-derived encryption keys for data protection only
- ZK proofs for enhanced privacy when needed

The application is in early bootstrap phase with core dependencies installed but main implementation not yet started.

## DDD Architecture Agent Guidelines

When working on this codebase, use the appropriate Domain-Driven Design agent for each task:

### ddd-enterprise-architect
Use for strategic architectural decisions:
- Defining bounded contexts for CEX, DEX, and wallet integrations
- Establishing communication patterns between portfolio aggregation domains
- Designing microservice boundaries for future scaling
- Creating ubiquitous language for financial domain concepts
- Aligning technical architecture with business goals

### ddd-domain-architect  
Use for domain-specific implementations:
- Translating enterprise patterns into the portfolio tracking domain
- Defining aggregates for wallet, transaction, and portfolio entities
- Establishing contracts between CEX/DEX integration modules
- Implementing repository patterns for multi-chain data access
- Adapting decentralization principles to specific domain requirements

### ddd-system-architect
Use for internal system design:
- Designing module structure for wallet connection features
- Selecting state management libraries (Zustand vs alternatives)
- Planning E2E test scenarios for multi-chain interactions
- Evaluating Web3 library choices for each blockchain
- Ensuring client-side sovereignty in system architecture

### ddd-unit-architect
Use for granular code architecture:
- Designing TypeScript classes for encryption services
- Creating file structures for React components
- Defining interfaces for wallet adapters
- Planning unit test specifications for domain logic
- Structuring value objects for cryptocurrency amounts

### ddd-software-engineer
Use for implementation tasks:
- Implementing architectural designs into TypeScript/React code
- Writing unit tests with Vitest for domain services
- Creating value objects and domain entities
- Implementing repository patterns for data access
- Translating unit architect specifications into working code

### code-review-expert
Use after implementing features:
- Review newly written wallet connection handlers
- Analyze security of encryption implementations
- Check React component best practices
- Verify TypeScript type safety
- Ensure adherence to DDD patterns