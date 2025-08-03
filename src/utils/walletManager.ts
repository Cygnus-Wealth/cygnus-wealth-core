import { WalletManager, WalletIntegrationConfig } from '@cygnus-wealth/wallet-integration-system';
import { getPreferredRpcEndpoint } from '../config/rpc';

let walletManagerInstance: WalletManager | null = null;

/**
 * Get or create a singleton WalletManager instance with proper RPC configuration
 */
export function getWalletManager(): WalletManager {
  if (!walletManagerInstance) {
    // For now, we'll use the first Solana RPC endpoint as the default
    // The wallet-integration-system will use this for Solana connections
    const config: WalletIntegrationConfig = {
      rpcUrl: getPreferredRpcEndpoint('solana')
    };
    
    walletManagerInstance = new WalletManager(config);
    
    // Store it globally for access from hooks
    (window as any).__cygnusWalletManager = walletManagerInstance;
  }
  
  return walletManagerInstance;
}

/**
 * Update the RPC configuration for the WalletManager
 */
export function updateWalletManagerRpc(rpcUrl: string): void {
  // Create a new instance with updated config
  const config: WalletIntegrationConfig = { rpcUrl };
  walletManagerInstance = new WalletManager(config);
  (window as any).__cygnusWalletManager = walletManagerInstance;
}