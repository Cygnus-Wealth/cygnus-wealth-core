/**
 * RPC endpoint configuration for different blockchain networks
 */

export const RPC_ENDPOINTS = {
  // Solana RPC endpoints (in order of preference)
  solana: [
    'https://solana-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/solana', 
    'https://solana.publicnode.com',
    'https://api.mainnet-beta.solana.com'
  ],
  
  // SUI RPC endpoints
  sui: [
    'https://fullnode.mainnet.sui.io',
    'https://rpc.ankr.com/sui',
    'https://sui-mainnet.nodeinfra.com'
  ],
  
  // EVM RPC endpoints (can be expanded per chain if needed)
  ethereum: [
    'https://eth-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
  ]
};

/**
 * Get the preferred RPC endpoint for a given network
 */
export function getPreferredRpcEndpoint(network: 'solana' | 'sui' | 'ethereum'): string {
  return RPC_ENDPOINTS[network][0];
}

/**
 * Get all RPC endpoints for a given network (for fallback)
 */
export function getRpcEndpoints(network: 'solana' | 'sui' | 'ethereum'): string[] {
  return RPC_ENDPOINTS[network];
}