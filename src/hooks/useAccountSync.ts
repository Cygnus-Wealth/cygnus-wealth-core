import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { createPublicClient, http, formatEther, type Address, erc20Abi } from 'viem';
import { mainnet, polygon, arbitrum, optimism } from 'viem/chains';
import { AssetValuator } from '@cygnus-wealth/asset-valuator';
import { formatBalance } from '../utils/formatters';
import type { Asset } from '../store/useStore';
import { 
  WalletManager, 
  Chain 
} from '@cygnus-wealth/wallet-integration-system';

const assetValuator = new AssetValuator();

// Chain mapping - supports both legacy and new Chain enum values
interface ChainMapEntry {
  chain: any;
  chainId: number;
  symbol: string;
  name: string;
}

const chainMap: Record<string, ChainMapEntry> = {
  'Ethereum': { chain: mainnet, chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  'Polygon': { chain: polygon, chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  'Arbitrum': { chain: arbitrum, chainId: 42161, symbol: 'ETH', name: 'Arbitrum ETH' },
  'Optimism': { chain: optimism, chainId: 10, symbol: 'ETH', name: 'Optimism ETH' },
  'BSC': { chain: mainnet, chainId: 56, symbol: 'BNB', name: 'BNB' },
  'Avalanche': { chain: mainnet, chainId: 43114, symbol: 'AVAX', name: 'Avalanche' },
  'Base': { chain: mainnet, chainId: 8453, symbol: 'ETH', name: 'Base ETH' },
  // Legacy uppercase names for compatibility
  'ETHEREUM': { chain: mainnet, chainId: 1, symbol: 'ETH', name: 'Ethereum' },
  'POLYGON': { chain: polygon, chainId: 137, symbol: 'MATIC', name: 'Polygon' },
  'ARBITRUM': { chain: arbitrum, chainId: 42161, symbol: 'ETH', name: 'Arbitrum ETH' },
  'OPTIMISM': { chain: optimism, chainId: 10, symbol: 'ETH', name: 'Optimism ETH' },
};

// Chain enum mapping
const chainEnumMap: Record<string, Chain> = {
  'Ethereum': Chain.ETHEREUM,
  'Polygon': Chain.POLYGON,
  'Arbitrum': Chain.ARBITRUM,
  'Optimism': Chain.OPTIMISM,
  'BSC': Chain.BSC,
  'Avalanche': Chain.AVALANCHE,
  'Base': Chain.BASE
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

      // Check if we have a wallet manager instance
      const walletManager = (window as any).__cygnusWalletManager as WalletManager | undefined;

      for (const account of walletAccounts) {
        if (!account.address) continue;

        try {
          // Check if this account should use WalletManager
          if (account.metadata?.useWalletManager && walletManager) {
            // Use WalletManager to fetch balances
            console.log(`Using WalletManager for ${account.label}`);
            
            try {
              // Get all balances from WalletManager
              const walletBalances = await walletManager.getAllBalances();
              
              // Filter balances for this specific account address
              const accountBalances = walletBalances.filter(
                balance => balance.walletAddress.toLowerCase() === account.address?.toLowerCase()
              );
              
              // Process each balance
              for (const balance of accountBalances) {
                // Get chain name from enum
                const chainName = Object.keys(chainEnumMap).find(
                  key => chainEnumMap[key] === balance.chain
                ) || 'Unknown';
                
                const chainConfig = chainMap[chainName];
                if (!chainConfig) continue;
                
                // Skip zero balances for native tokens
                if (balance.balance === '0' && balance.assetType === 'NATIVE') continue;
                
                // Get price for the asset
                let priceData = { price: 0 };
                try {
                  const symbol = balance.symbol || chainConfig.symbol;
                  priceData = await assetValuator.getPrice(symbol, 'USD');
                  updatePrice(symbol, priceData.price);
                } catch {
                  console.warn(`Price not available for ${balance.symbol}`);
                }
                
                // Format balance
                const formattedBalance = formatBalance(
                  balance.balance,
                  balance.decimals || 18
                );
                
                // Create asset entry
                const asset: Asset = {
                  id: `${account.id}-${balance.symbol}-${chainName}-${balance.assetId}`,
                  symbol: balance.symbol || chainConfig.symbol,
                  name: balance.name || chainConfig.name,
                  balance: formattedBalance,
                  source: account.label,
                  chain: chainName,
                  accountId: account.id,
                  priceUsd: priceData.price,
                  valueUsd: parseFloat(formattedBalance) * priceData.price,
                  metadata: {
                    address: account.address,
                    isMultiAccount: false
                  }
                };
                
                allAssets.push(asset);
              }
            } catch (error) {
              console.error(`Error fetching balances with WalletManager for ${account.label}:`, error);
              // Fall back to manual fetching
              await fetchBalancesManually();
            }
          } else {
            // Use manual fetching for accounts not using WalletManager
            await fetchBalancesManually();
          }

          async function fetchBalancesManually() {
            // Check if this is a multi-chain wallet
            if (account.platform === 'Multi-Chain EVM' && account.metadata?.detectedChains) {
              // Use configured chains from account metadata
              let configuredChains = account.metadata?.detectedChains || [];
              
              if (configuredChains.length === 0) {
                console.warn(`No configured chains found for ${account.label}, using Ethereum as default`);
                configuredChains = ['Ethereum'];
              }
              
              // Get the address for this account
              const address = account.address!;
              
              // Fetch balances from each configured chain
              const balancePromises: Promise<Asset | null>[] = [];
              
              for (const chainName of configuredChains) {
                balancePromises.push(
                  (async () => {
                    try {
                      const chainConfig = chainMap[chainName];
                      if (!chainConfig) {
                        console.warn(`No chain config for ${chainName}`);
                        return null;
                      }
                      
                      // Create public client for the chain
                      const client = createPublicClient({
                        chain: chainConfig.chain,
                        transport: http()
                      });

                      // Fetch balance
                      const balance = await client.getBalance({ 
                        address: address as Address 
                      });
                      
                      // Skip zero balances
                      if (balance === 0n) return null;
                      
                      // Get native token price
                      let priceData = { price: 0 };
                      try {
                        priceData = await assetValuator.getPrice(chainConfig.symbol, 'USD');
                        updatePrice(chainConfig.symbol, priceData.price);
                      } catch {
                        console.warn(`Price not available for ${chainConfig.symbol}`);
                      }
                      
                      // Create asset entry
                      const asset: Asset = {
                        id: `${account.id}-${chainConfig.symbol}-${chainName}-${address}`,
                        symbol: chainConfig.symbol,
                        name: chainConfig.name,
                        balance: formatBalance(balance.toString(), 18),
                        source: account.label,
                        chain: chainName,
                        accountId: account.id,
                        priceUsd: priceData.price,
                        valueUsd: parseFloat(formatBalance(balance.toString(), 18)) * priceData.price,
                        metadata: {
                          address: address,
                          isMultiAccount: false
                        }
                      };
                      
                      return asset;
                    } catch (error) {
                      console.error(`Error fetching balance for ${chainName} - ${address}:`, error);
                      return null;
                    }
                  })()
                );
              }
              
              // Wait for all balance fetches to complete
              const results = await Promise.all(balancePromises);
              const validAssets = results.filter((asset): asset is Asset => asset !== null);
              allAssets.push(...validAssets);
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
                      } catch {
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
            }
          }

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