// Temporary compatibility layer until libraries are properly built with ES modules
// This provides a working implementation while avoiding module resolution issues

// Types
export interface ConnectionStatus {
  chainId: number;
  isConnected: boolean;
  lastConnected?: number;
  lastDisconnected?: number;
  reconnectAttempts: number;
  error?: string;
}

export interface Balance {
  assetId: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  amount: string;
  value?: {
    amount: number;
    currency: string;
  };
}

export interface Transaction {
  id: string;
  accountId: string;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  hash?: string;
  chain?: string;
  from?: string;
  to?: string;
  timestamp: Date;
  blockNumber?: number;
  assets_in?: Array<{
    asset: { symbol: string };
    amount: string;
  }>;
  assets_out?: Array<{
    asset: { symbol: string };
    amount: string;
  }>;
}

// Hook implementations
export function useEvmBalanceRealTime(
  address: `0x${string}` | undefined,
  chainId: number,
  options: { enabled?: boolean } = {}
) {
  // Mock implementation
  const mockBalance: Balance | null = options.enabled && address ? {
    assetId: 'eth',
    asset: {
      id: 'eth',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    amount: '0.0',
    value: {
      amount: 0,
      currency: 'USD'
    }
  } : null;

  return {
    balance: mockBalance,
    isLoading: false,
    error: null,
    isConnected: true
  };
}

export function useEvmTransactionMonitor(
  address: `0x${string}` | undefined,
  chainId: number,
  options: { enabled?: boolean } = {}
) {
  // Mock implementation
  return {
    transactions: [] as Transaction[]
  };
}

// ConnectionManager implementation
export class ConnectionManager {
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  
  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.listeners.add(listener);
    
    // Simulate initial connection
    setTimeout(() => {
      listener({
        chainId: 1,
        isConnected: true,
        lastConnected: Date.now(),
        reconnectAttempts: 0
      });
    }, 100);
    
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  connect(chainId: number) {
    // Mock connect
    return Promise.resolve();
  }
  
  disconnect(chainId: number) {
    // Mock disconnect
  }
}