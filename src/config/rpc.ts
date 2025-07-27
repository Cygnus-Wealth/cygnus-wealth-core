// RPC Configuration for blockchain connections
// Using public endpoints that don't require API keys

export const RPC_CONFIG = {
  // Ethereum Mainnet
  1: {
    http: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
      'https://cloudflare-eth.com'
    ],
    ws: [
      'wss://ethereum.publicnode.com',
      'wss://eth.llamarpc.com'
    ]
  },
  // Polygon
  137: {
    http: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.llamarpc.com'
    ],
    ws: [
      'wss://polygon-bor.publicnode.com',
      'wss://polygon.llamarpc.com'
    ]
  },
  // Arbitrum One
  42161: {
    http: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com'
    ],
    ws: [
      'wss://arbitrum-one.publicnode.com',
      'wss://arbitrum.llamarpc.com'
    ]
  },
  // Optimism
  10: {
    http: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
      'https://optimism.llamarpc.com'
    ],
    ws: [
      'wss://optimism.publicnode.com',
      'wss://optimism.llamarpc.com'
    ]
  }
};

// Get the first available RPC endpoint for a chain
export function getRpcUrl(chainId: number, type: 'http' | 'ws' = 'http'): string {
  const config = RPC_CONFIG[chainId as keyof typeof RPC_CONFIG];
  if (!config) {
    throw new Error(`No RPC configuration for chain ${chainId}`);
  }
  
  const urls = type === 'http' ? config.http : config.ws;
  return urls[0]; // Return the first URL, could be enhanced with failover
}

// Environment variable support for custom RPC URLs
export function getCustomRpcUrl(chainId: number, type: 'http' | 'ws' = 'http'): string | null {
  const envKey = `VITE_RPC_${chainId}_${type.toUpperCase()}`;
  return import.meta.env[envKey] || null;
}