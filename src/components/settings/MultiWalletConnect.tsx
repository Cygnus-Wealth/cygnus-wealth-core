import { useState } from 'react';
import {
  Button,
  Menu,
  Box,
  Text,
  Stack,
  createToaster,
  Image
} from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { WalletManager, IntegrationSource } from '@cygnus-wealth/wallet-integration-system';

const toaster = createToaster({
  placement: 'top'
});

interface WalletProvider {
  name: string;
  icon?: string;
  check: () => boolean;
  getProvider: () => any;
}

const WALLET_PROVIDERS: WalletProvider[] = [
  {
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isMetaMask);
      }
      return window.ethereum?.isMetaMask || false;
    },
    getProvider: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.find((p: any) => p.isMetaMask);
      }
      return window.ethereum;
    }
  },
  {
    name: 'Rabby',
    icon: 'https://rabby.io/assets/logo.png',
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isRabby);
      }
      return window.ethereum?.isRabby || false;
    },
    getProvider: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.find((p: any) => p.isRabby);
      }
      return window.ethereum;
    }
  },
  {
    name: 'Coinbase Wallet',
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isCoinbaseWallet);
      }
      return window.ethereum?.isCoinbaseWallet || false;
    },
    getProvider: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
      }
      return window.ethereum;
    }
  },
  {
    name: 'Brave Wallet',
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isBraveWallet);
      }
      return window.ethereum?.isBraveWallet || false;
    },
    getProvider: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.find((p: any) => p.isBraveWallet);
      }
      return window.ethereum;
    }
  }
];

export default function MultiWalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { addAccount } = useStore();
  const [walletManager] = useState(() => new WalletManager());

  const detectWallets = () => {
    if (!window.ethereum) return [];
    
    return WALLET_PROVIDERS.filter(wallet => {
      try {
        return wallet.check();
      } catch (e) {
        console.error(`Error checking ${wallet.name}:`, e);
        return false;
      }
    });
  };

  const handleConnect = async (wallet: WalletProvider) => {
    setIsConnecting(true);
    
    try {
      const provider = wallet.getProvider();
      if (!provider) {
        throw new Error(`${wallet.name} provider not found`);
      }

      console.log(`Connecting with ${wallet.name}...`);
      
      // First request account access to ensure we have permission
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Map wallet name to IntegrationSource
      const sourceMap: { [key: string]: IntegrationSource } = {
        'MetaMask': IntegrationSource.METAMASK,
        'Rabby': IntegrationSource.RABBY,
        'Coinbase Wallet': IntegrationSource.COINBASE_WALLET,
        'Brave Wallet': IntegrationSource.METAMASK // Brave uses MetaMask-like interface
      };
      
      const source = sourceMap[wallet.name] || IntegrationSource.METAMASK;
      
      // First, let's detect which chains are configured in the wallet
      const configuredChains: string[] = [];
      const chainChecks = [
        { chainId: '0x1', name: 'Ethereum' },
        { chainId: '0x89', name: 'Polygon' },
        { chainId: '0x38', name: 'BSC' },
        { chainId: '0xa4b1', name: 'Arbitrum' },
        { chainId: '0xa', name: 'Optimism' },
        { chainId: '0xa86a', name: 'Avalanche' },
        { chainId: '0x2105', name: 'Base' }
      ];
      
      // Try to detect configured chains by attempting to switch to them
      for (const chain of chainChecks) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chain.chainId }]
          });
          configuredChains.push(chain.name);
          console.log(`Chain ${chain.name} is configured`);
        } catch (error: any) {
          if (error.code === 4902) {
            // Chain not added to wallet
            console.log(`Chain ${chain.name} is not configured`);
          } else if (error.code === 4001) {
            // User rejected - stop checking
            throw new Error('User rejected chain switch');
          }
        }
      }
      
      if (configuredChains.length === 0) {
        // At least Ethereum should be available
        configuredChains.push('Ethereum');
      }
      
      // Get current chain to restore later
      const originalChainId = await provider.request({ method: 'eth_chainId' });
      
      try {
        // Use wallet-integration-system to connect to all chains
        console.log(`Connecting ${wallet.name} with wallet-integration-system...`);
        
        // Store wallet manager globally for use in sync
        if (!(window as any).__cygnusWalletManager) {
          (window as any).__cygnusWalletManager = walletManager;
        }
        
        // Connect to all EVM chains to get all accounts and balances
        const result = await walletManager.connectAllEVMChains(source);
        console.log('Connection result:', result);
        
        // Get all unique accounts from connections
        const uniqueAddresses = new Set<string>();
        result.connections.forEach(conn => uniqueAddresses.add(conn.address));
        const allAccounts = Array.from(uniqueAddresses);
        
        console.log(`Found ${allAccounts.length} unique accounts across ${result.connections.length} chains`);
        
        // Store wallet info with all accounts and chains
        const walletId = `wallet-${wallet.name.toLowerCase()}-${Date.now()}`;
        
        addAccount({
          id: walletId,
          type: 'wallet',
          platform: 'Multi-Chain EVM',
          label: `${wallet.name} (${allAccounts.length} account${allAccounts.length > 1 ? 's' : ''})`,
          address: allAccounts[0], // Primary account
          status: 'connected',
          metadata: {
            walletManagerId: walletId,
            chains: configuredChains,
            source: source,
            walletType: wallet.name,
            detectedChains: configuredChains,
            currentChainId: parseInt(originalChainId, 16),
            allAddresses: allAccounts,
            accountCount: allAccounts.length,
            useWalletManager: true // Flag to use new wallet manager approach
          }
        });
        
        toaster.create({
          title: 'Wallet Connected',
          description: `Connected ${allAccounts.length} ${wallet.name} account${allAccounts.length > 1 ? 's' : ''} across ${configuredChains.length} chain${configuredChains.length > 1 ? 's' : ''}`,
          type: 'success',
          duration: 5000,
        });
        
        // Try to restore original chain
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: originalChainId }]
          });
        } catch (e) {
          console.error('Could not restore original chain:', e);
        }
      } catch (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      
      let message = 'Failed to connect wallet';
      if (error.code === 4001) {
        message = 'You rejected the connection';
      } else if (error.code === -32002) {
        message = 'A connection request is already pending. Please check your wallet.';
      } else if (error.message) {
        message = error.message;
      }
      
      toaster.create({
        title: 'Connection Failed',
        description: message,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const availableWallets = detectWallets();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          colorScheme="purple"
          isLoading={isConnecting}
          loadingText="Connecting..."
        >
          <FiExternalLink />
          Multi-Wallet Connect
        </Button>
      </Menu.Trigger>
      
      <Menu.Positioner>
        <Menu.Content minW="250px">
          <Box p={2}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
              Select Wallet
            </Text>
            <Stack spacing={1}>
              {availableWallets.length === 0 ? (
                <Text fontSize="sm" color="gray.500" p={2}>
                  No wallets detected. Please install a wallet extension.
                </Text>
              ) : (
                availableWallets.map((wallet) => (
                  <Menu.Item
                    key={wallet.name}
                    value={wallet.name}
                    onClick={() => handleConnect(wallet)}
                  >
                    <Box display="flex" alignItems="center" gap={2} w="full">
                      {wallet.icon && (
                        <Image src={wallet.icon} alt={wallet.name} w={5} h={5} />
                      )}
                      <Text>{wallet.name}</Text>
                    </Box>
                  </Menu.Item>
                ))
              )}
            </Stack>
          </Box>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}