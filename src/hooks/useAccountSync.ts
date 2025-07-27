import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { createPublicClient, http, formatEther, type Address } from 'viem';
import { mainnet, polygon, arbitrum, optimism } from 'viem/chains';
import { AssetValuator } from '@cygnus-wealth/asset-valuator';
import { formatBalance } from '../utils/formatters';
import type { Asset } from '../store/useStore';

const assetValuator = new AssetValuator();

// Chain mapping
const chainMap = {
  'Ethereum': { chain: mainnet, chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  'Polygon': { chain: polygon, chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  'Arbitrum': { chain: arbitrum, chainId: 42161, symbol: 'ETH', name: 'Arbitrum ETH' },
  'Optimism': { chain: optimism, chainId: 10, symbol: 'ETH', name: 'Optimism ETH' },
};

export function useAccountSync() {
  const { 
    accounts, 
    updateAccount, 
    setAssets, 
    updatePrice, 
    calculateTotalValue,
    setIsLoading 
  } = useStore();

  // Get all wallet accounts
  const walletAccounts = accounts.filter(acc => acc.type === 'wallet' && acc.status === 'connected');

  // Sync each wallet account
  useEffect(() => {
    const syncAccounts = async () => {
      if (walletAccounts.length === 0) {
        setAssets([]);
        calculateTotalValue();
        return;
      }

      setIsLoading(true);
      const allAssets: Asset[] = [];

      for (const account of walletAccounts) {
        if (!account.address) continue;

        try {
          const chainConfig = chainMap[account.platform as keyof typeof chainMap] || chainMap['Ethereum'];
          
          // Create public client for the chain
          const client = createPublicClient({
            chain: chainConfig.chain,
            transport: http()
          });

          // Fetch balance
          const balance = await client.getBalance({ 
            address: account.address as Address 
          });

          // Get token price
          const priceData = await assetValuator.getPrice(chainConfig.symbol, 'USD');
          updatePrice(chainConfig.symbol, priceData.price);

          // Calculate value
          const balanceInEth = formatEther(balance);
          const valueUsd = parseFloat(balanceInEth) * priceData.price;
          
          // Create asset entry
          const asset: Asset = {
            id: `${account.id}-${chainConfig.symbol}-${chainConfig.chainId}`,
            symbol: chainConfig.symbol,
            name: chainConfig.name,
            balance: formatBalance(balance.toString(), 18),
            source: account.label,
            chain: account.platform,
            accountId: account.id,
            priceUsd: priceData.price,
            valueUsd: valueUsd
          };
          
          allAssets.push(asset);

          updateAccount(account.id, { 
            lastSync: new Date().toISOString(),
            status: 'connected'
          });
        } catch (error) {
          console.error(`Failed to sync account ${account.id}:`, error);
          updateAccount(account.id, { status: 'error' });
        }
      }

      setAssets(allAssets);
      calculateTotalValue();
      setIsLoading(false);
    };

    syncAccounts();
    
    // Refresh every minute
    const interval = setInterval(syncAccounts, 60000);
    
    return () => clearInterval(interval);
  }, [walletAccounts.length]);
}