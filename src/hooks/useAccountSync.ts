import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { createPublicClient, http, formatEther, type Address, erc20Abi } from 'viem';
import { mainnet, polygon, arbitrum, optimism } from 'viem/chains';
import { AssetValuator } from '@cygnus-wealth/asset-valuator';
import { formatBalance } from '../utils/formatters';
import type { Asset, Token } from '../store/useStore';
import type { WalletBalance } from '@cygnus-wealth/wallet-integration-system';

const assetValuator = new AssetValuator();

// Chain mapping - supports both legacy and new Chain enum values
const chainMap: Record<string, any> = {
  'Ethereum': { chain: mainnet, chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  'Polygon': { chain: polygon, chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  'Arbitrum': { chain: arbitrum, chainId: 42161, symbol: 'ETH', name: 'Arbitrum ETH' },
  'Optimism': { chain: optimism, chainId: 10, symbol: 'ETH', name: 'Optimism ETH' },
  'ETHEREUM': { chain: mainnet, chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  'POLYGON': { chain: polygon, chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  'ARBITRUM': { chain: arbitrum, chainId: 42161, symbol: 'ETH', name: 'Arbitrum ETH' },
  'OPTIMISM': { chain: optimism, chainId: 10, symbol: 'ETH', name: 'Optimism ETH' },
  'BSC': { chain: mainnet, chainId: 56, symbol: 'BNB', name: 'BNB' }, // TODO: Add BSC chain from viem
  'AVALANCHE': { chain: mainnet, chainId: 43114, symbol: 'AVAX', name: 'Avalanche' }, // TODO: Add Avalanche chain from viem
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
          // Check if this is a multi-chain wallet
          if (account.platform === 'Multi-Chain EVM' && account.metadata?.walletManagerId) {
            // Use wallet-integration-system for multi-chain wallets
            const walletManager = (window as any).__walletManager;
            
            if (!walletManager) {
              console.error('WalletManager not found');
              continue;
            }

            // Get all balances from connected chains
            const balances: WalletBalance[] = await walletManager.getAllBalances();
            
            // Convert WalletBalance to Asset
            for (const balance of balances) {
              try {
                // Skip zero balances
                if (parseFloat(balance.amount) === 0) continue;

                // Get price
                const priceData = await assetValuator.getPrice(balance.asset.symbol, 'USD');
                updatePrice(balance.asset.symbol, priceData.price);
                
                // Create asset entry
                const asset: Asset = {
                  id: `${account.id}-${balance.asset.symbol}-${balance.chain}`,
                  symbol: balance.asset.symbol,
                  name: balance.asset.name,
                  balance: balance.amount,
                  source: account.label,
                  chain: balance.chain,
                  accountId: account.id,
                  priceUsd: priceData.price,
                  valueUsd: parseFloat(balance.amount) * priceData.price
                };
                
                allAssets.push(asset);
              } catch (priceError) {
                console.warn(`Price not available for ${balance.asset.symbol}`);
                // Still add the asset without price
                const asset: Asset = {
                  id: `${account.id}-${balance.asset.symbol}-${balance.chain}`,
                  symbol: balance.asset.symbol,
                  name: balance.asset.name,
                  balance: balance.amount,
                  source: account.label,
                  chain: balance.chain,
                  accountId: account.id,
                  priceUsd: null,
                  valueUsd: null
                };
                allAssets.push(asset);
              }
            }

            updateAccount(account.id, { 
              lastSync: new Date().toISOString(),
              status: 'connected'
            });
          } else {
            // Legacy single-chain handling
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

            // Fetch ERC20 token balances if any tokens are configured
            if (account.tokens && account.tokens.length > 0) {
              for (const token of account.tokens) {
                try {
                  // Ensure token is for the correct chain
                  if (token.chainId !== chainConfig.chainId) continue;

                  // Fetch token balance
                  const tokenBalance = await client.readContract({
                    address: token.address as Address,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [account.address as Address]
                  });

                  // Check if balance is zero
                  const isZeroBalance = tokenBalance === 0n;

                  // Get token price - skip for zero balance tokens
                  let tokenPrice = null;
                  let tokenValueUsd = null;
                  
                  if (!isZeroBalance) {
                    try {
                      const tokenPriceData = await assetValuator.getPrice(token.symbol, 'USD');
                      tokenPrice = tokenPriceData.price;
                      updatePrice(token.symbol, tokenPrice);
                      
                      // Calculate value
                      const tokenBalanceFormatted = formatBalance(tokenBalance.toString(), token.decimals);
                      tokenValueUsd = parseFloat(tokenBalanceFormatted) * tokenPrice;
                    } catch (priceError) {
                      console.warn(`Price not available for ${token.symbol}. You may need to update the token symbol mapping in asset-valuator.`);
                      console.debug('Price fetch error:', priceError);
                    }
                  } else {
                    // For zero balance tokens, set price and value to 0
                    tokenPrice = 0;
                    tokenValueUsd = 0;
                  }

                  // Create token asset entry
                  const tokenAsset: Asset = {
                    id: `${account.id}-${token.symbol}-${token.address}`,
                    symbol: token.symbol,
                    name: token.name,
                    balance: formatBalance(tokenBalance.toString(), token.decimals),
                    source: account.label,
                    chain: account.platform,
                    accountId: account.id,
                    priceUsd: tokenPrice,
                    valueUsd: tokenValueUsd
                  };
                  
                  allAssets.push(tokenAsset);
                } catch (tokenError) {
                  console.error(`Failed to fetch balance for token ${token.symbol}:`, tokenError);
                }
              }
            }

            updateAccount(account.id, { 
              lastSync: new Date().toISOString(),
              status: 'connected'
            });
          }
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