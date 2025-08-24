import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { createPublicClient, http, formatEther, type Address, erc20Abi } from 'viem';
import { mainnet, polygon, arbitrum, optimism } from 'viem/chains';
import { AssetValuator } from '@cygnus-wealth/asset-valuator';
import { formatBalance } from '../utils/formatters';
import type { Asset } from '../store/useStore';
import { 
  WalletManager, 
  Chain,
  SolanaWalletIntegration,
  SuiWalletIntegration,
  IntegrationSource
} from '@cygnus-wealth/wallet-integration-system';
import { SolanaChainService } from '../infrastructure/blockchain/solana/SolanaChainService';
import { rpcConfigService } from '../infrastructure/rpc/RpcConfigurationService';
import { ChainId } from '../domain/chain/ChainId';
import { AssetValue } from '../domain/asset/AssetValue';

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
  'Base': Chain.BASE,
  'Solana': Chain.SOLANA,
  'SUI': Chain.SUI
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

  // Initialize chain services
  const solanaChainService = useMemo(() => new SolanaChainService(), []);

  // Helper function to create EVM clients using RPC service
  const createEvmClient = (chainName: string) => {
    try {
      // Handle special test cases and fallback scenarios
      let chainInfo = chainMap[chainName];
      if (!chainInfo) {
        console.warn(`Chain "${chainName}" not found in chainMap, falling back to Ethereum`);
        chainInfo = chainMap['Ethereum']; // Default fallback to Ethereum
      }

      // Try to get custom RPC URL first, then fall back to viem default
      let rpcUrl: string | undefined;
      try {
        const chainId = ChainId.fromChainName(chainName);
        if (chainId.isEvmChain() && chainId.getNumericId()) {
          const customUrl = rpcConfigService.getActiveEndpoint(chainId.getChainType() as any);
          if (customUrl) {
            rpcUrl = customUrl;
          }
        }
      } catch (error) {
        // ChainId doesn't support this chain name, use viem default
        console.warn(`Could not get RPC URL for ${chainName}, using viem default`);
      }

      return createPublicClient({
        chain: chainInfo.chain,
        transport: http(rpcUrl) // Use custom RPC or viem default
      });
    } catch (error) {
      console.error(`Failed to create EVM client for ${chainName}:`, error);
      // Create a fallback client with mainnet
      return createPublicClient({
        chain: mainnet,
        transport: http()
      });
    }
  };

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
                if (balance.amount === '0' && balance.asset.type === 'NATIVE') continue;
                
                // Get price for the asset
                let priceData = { price: 0 };
                try {
                  const symbol = balance.asset.symbol || chainConfig.symbol;
                  priceData = await assetValuator.getPrice(symbol, 'USD');
                  updatePrice(symbol, priceData?.price || 0);
                } catch {
                  console.warn(`Price not available for ${balance.asset.symbol}`);
                }
                
                // Format balance
                const formattedBalance = formatBalance(
                  balance.amount,
                  balance.asset.decimals || 18
                );
                
                // Create asset entry
                const asset: Asset = {
                  id: `${account.id}-${balance.asset.symbol}-${chainName}-${balance.assetId}`,
                  symbol: balance.asset.symbol || chainConfig.symbol,
                  name: balance.asset.name || chainConfig.name,
                  balance: formattedBalance,
                  source: account.label,
                  chain: chainName,
                  accountId: account.id,
                  priceUsd: priceData?.price || 0,
                  valueUsd: parseFloat(formattedBalance) * (priceData?.price || 0),
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
                      const client = createEvmClient(chainName);

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
                        updatePrice(chainConfig.symbol, priceData?.price || 0);
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
                        priceUsd: priceData?.price || 0,
                        valueUsd: parseFloat(formatBalance(balance.toString(), 18)) * (priceData?.price || 0),
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
            } else if (account.platform === 'Solana') {
              // Use QuickNode RPC for Solana balance queries
              try {
                console.log(`Fetching Solana balances using SolanaChainService for ${account.address}`);
                
                // Use the new SolanaChainService instead of hardcoded RPC
                const accountInfoResult = await solanaChainService.getAccountInfo(account.address);
                
                if (accountInfoResult.isFailure) {
                  throw new Error(`Failed to fetch Solana account info: ${accountInfoResult.error.message}`);
                }
                
                const accountInfo = accountInfoResult.value;
                console.log(`Fetched ${accountInfo.totalAccounts} Solana assets via ${solanaChainService.getCurrentRpcUrl()}`);
                
                // Process SOL balance
                if (!accountInfo.solBalance.isZero()) {
                  let priceData = { price: 0 };
                  try {
                    priceData = await assetValuator.getPrice('SOL', 'USD');
                    updatePrice('SOL', priceData?.price || 0);
                  } catch (priceError) {
                    console.warn('Price not available for SOL');
                  }
                  
                  const solAsset: Asset = {
                    id: `${account.id}-SOL-solana`,
                    symbol: 'SOL',
                    name: 'Solana',
                    balance: accountInfo.solBalance.getAmount(),
                    source: account.label,
                    chain: 'Solana',
                    accountId: account.id,
                    priceUsd: priceData?.price || 0,
                    valueUsd: accountInfo.solBalance.getAmountAsNumber() * (priceData?.price || 0)
                  };
                  
                  allAssets.push(solAsset);
                }
                
                // Process token balances
                for (const tokenBalance of accountInfo.tokenBalances) {
                  if (tokenBalance.balance.isZero()) continue;
                  
                  // Use mint address as symbol if no symbol is available
                  const symbol = tokenBalance.symbol || tokenBalance.mint.substring(0, 8);
                  
                  let priceData = { price: 0 };
                  try {
                    priceData = await assetValuator.getPrice(symbol, 'USD');
                    updatePrice(symbol, priceData?.price || 0);
                  } catch (priceError) {
                    console.warn(`Price not available for ${symbol}`);
                  }
                  
                  const tokenAsset: Asset = {
                    id: `${account.id}-${symbol}-solana`,
                    symbol: symbol,
                    name: tokenBalance.name || symbol,
                    balance: tokenBalance.balance.getAmount(),
                    source: account.label,
                    chain: 'Solana',
                    accountId: account.id,
                    priceUsd: priceData?.price || 0,
                    valueUsd: tokenBalance.balance.getAmountAsNumber() * (priceData?.price || 0)
                  };
                  
                  allAssets.push(tokenAsset);
                }
              } catch (error) {
                console.error(`Failed to fetch Solana balances for ${account.address}:`, error);
                
                // If RPC service fails, add a placeholder asset
                const asset: Asset = {
                  id: `${account.id}-SOL-solana-error`,
                  symbol: 'SOL',
                  name: 'Solana (Connection Error)',
                  balance: '---',
                  source: account.label,
                  chain: 'Solana',
                  accountId: account.id,
                  priceUsd: 0,
                  valueUsd: 0,
                  metadata: {
                    error: 'Failed to connect to Solana RPC'
                  }
                };
                
                allAssets.push(asset);
              }
              
            } else if (account.platform === 'SUI') {
              // Use wallet-integration-system's built-in SUI support
              try {
                // Create integration - the wallet-integration-system now handles everything properly
                const suiIntegration = new SuiWalletIntegration(
                  Chain.SUI,
                  IntegrationSource.SUIET
                );
                
                // Connect and get balances
                await suiIntegration.connect();
                const balances = await suiIntegration.getBalances();
                
                // Process each balance
                for (const balance of balances) {
                  if (balance.amount === '0') continue;
                  
                  // Get price from asset valuator
                  let priceData = { price: 0 };
                  try {
                    priceData = await assetValuator.getPrice(balance.asset.symbol, 'USD');
                    updatePrice(balance.asset.symbol, priceData?.price || 0);
                  } catch {
                    console.warn(`Price not available for ${balance.asset.symbol}`);
                  }
                  
                  const asset: Asset = {
                    id: `${account.id}-${balance.asset.symbol}-sui`,
                    symbol: balance.asset.symbol,
                    name: balance.asset.name || balance.asset.symbol,
                    balance: balance.amount,
                    source: account.label,
                    chain: 'SUI',
                    accountId: account.id,
                    priceUsd: priceData?.price || 0,
                    valueUsd: parseFloat(balance.amount) * (priceData?.price || 0)
                  };
                  
                  allAssets.push(asset);
                }
                
                // Optional: Subscribe to real-time updates
                if (account.metadata?.enableRealTimeUpdates) {
                  await suiIntegration.subscribeToBalances(
                    account.address,
                    (updatedBalances) => {
                      console.log('SUI balance update:', updatedBalances);
                      // Handle real-time updates if needed
                    }
                  );
                }
              } catch (error) {
                console.error(`Failed to fetch SUI balances for ${account.address}:`, error);
              }
              
            } else {
              // Legacy EVM single-chain handling
              const chainConfig = chainMap[account.platform as keyof typeof chainMap] || chainMap['Ethereum'];
              
              // Create public client for the chain
              const client = createEvmClient(account.platform);

              // Fetch balance
              const balance = await client.getBalance({ 
                address: account.address as Address 
              });

              // Get token price
              let priceData = { price: 0 };
              try {
                priceData = await assetValuator.getPrice(chainConfig.symbol, 'USD');
                updatePrice(chainConfig.symbol, priceData?.price || 0);
              } catch {
                console.warn(`Price not available for ${chainConfig.symbol}`);
              }

              // Calculate value
              const balanceInEth = formatEther(balance);
              const valueUsd = parseFloat(balanceInEth) * (priceData?.price || 0);
              
              // Create asset entry
              const asset: Asset = {
                id: `${account.id}-${chainConfig.symbol}-${chainConfig.chainId}`,
                symbol: chainConfig.symbol,
                name: chainConfig.name,
                balance: formatBalance(balance.toString(), 18),
                source: account.label,
                chain: account.platform,
                accountId: account.id,
                priceUsd: priceData?.price || 0,
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
                        // Price fetch error already logged above
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
  }, [accounts.length]); // Only re-run when number of accounts changes
}