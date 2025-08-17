// Example of using Phantom wallet's built-in provider methods
import { PublicKey } from '@solana/web3.js';

interface PhantomProvider {
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  request: (method: string, params?: any) => Promise<any>;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export class SolanaWalletProvider {
  private provider: PhantomProvider | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      this.provider = window.solana;
    }
  }

  async connect(): Promise<string | null> {
    if (!this.provider) return null;
    
    try {
      const resp = await this.provider.connect();
      return resp.publicKey.toString();
    } catch (err) {
      console.error('Failed to connect:', err);
      return null;
    }
  }

  // ✅ WHAT YOU CAN DO - These work without RPC:
  
  // 1. Get connected wallet address
  getPublicKey(): string | null {
    return this.provider?.publicKey?.toString() || null;
  }

  // 2. Check connection status
  isConnected(): boolean {
    return this.provider?.isConnected || false;
  }

  // 3. Sign messages (for authentication)
  async signMessage(message: string): Promise<Uint8Array | null> {
    if (!this.provider) return null;
    
    const encodedMessage = new TextEncoder().encode(message);
    const { signature } = await this.provider.signMessage(encodedMessage);
    return signature;
  }

  // 4. Listen to account changes
  onAccountChange(callback: (publicKey: PublicKey | null) => void) {
    this.provider?.on('accountChanged', callback);
  }

  // 5. Disconnect wallet
  async disconnect() {
    await this.provider?.disconnect();
  }

  // ❌ WHAT YOU CAN'T DO - These require RPC access:
  
  // Cannot get balance without RPC
  async getBalance(): Promise<number> {
    // This would require an RPC call:
    // const connection = new Connection('...');
    // const balance = await connection.getBalance(publicKey);
    throw new Error('Balance queries require RPC access');
  }

  // Cannot get token balances without RPC
  async getTokenBalances(): Promise<any[]> {
    // This would require RPC calls:
    // const tokenAccounts = await connection.getParsedTokenAccountsByOwner(...)
    throw new Error('Token queries require RPC access');
  }

  // Cannot get transaction history without RPC
  async getTransactionHistory(): Promise<any[]> {
    // This would require RPC calls:
    // const signatures = await connection.getSignaturesForAddress(...)
    throw new Error('Transaction queries require RPC access');
  }

  // ⚠️ WORKAROUNDS - Some wallets provide these:
  
  // Some wallets expose balance through custom methods (not standard)
  async tryGetBalanceFromProvider(): Promise<number | null> {
    // Phantom doesn't provide this, but some wallets might
    // This is non-standard and varies by wallet
    
    try {
      // Some wallets might support custom RPC methods
      const result = await this.provider?.request?.('getBalance');
      return result;
    } catch {
      return null;
    }
  }
}