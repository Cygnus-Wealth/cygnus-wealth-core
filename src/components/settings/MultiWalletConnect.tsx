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
      
      // Set the provider on window.ethereum temporarily for wallet-integration-system
      const originalEthereum = window.ethereum;
      window.ethereum = provider;
      
      try {
        // Use connectAllEVMChains to connect to all supported chains
        if (typeof (walletManager as any).connectAllEVMChains === 'function') {
          console.log('Using connectAllEVMChains method');
          
          const { connections, balances } = await (walletManager as any).connectAllEVMChains(source);
          
          if (connections.length === 0) {
            throw new Error('No chains connected');
          }
          
          // Get the address (same for all EVM chains)
          const address = connections[0].address;
          
          // Add a single multi-chain wallet account
          addAccount({
            id: `wallet-${wallet.name.toLowerCase()}-${Date.now()}`,
            type: 'wallet',
            platform: 'Multi-Chain EVM',
            label: `${wallet.name} (Multi-Chain)`,
            address: address,
            status: 'connected',
            metadata: {
              walletManagerId: 'default',
              chains: connections.map((c: any) => c.chain),
              source: source,
              walletType: wallet.name
            }
          });
          
          // Store wallet manager instance globally for balance fetching
          (window as any).__walletManager = walletManager;
          
          toaster.create({
            title: 'Wallet Connected',
            description: `Connected to ${connections.length} chains: ${address.slice(0, 6)}...${address.slice(-4)}`,
            type: 'success',
            duration: 5000,
          });
        } else {
          throw new Error('Multi-chain connection not available');
        }
      } finally {
        // Restore original ethereum provider
        window.ethereum = originalEthereum;
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