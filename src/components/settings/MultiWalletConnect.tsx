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
      
      // Use the specific provider's request method
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // Get the current chain ID
      const chainId = await provider.request({ method: 'eth_chainId' });
      const chainIdNumber = parseInt(chainId, 16);
      
      // Map chain ID to platform name
      const platformMap: { [key: number]: string } = {
        1: 'Ethereum',
        137: 'Polygon',
        42161: 'Arbitrum',
        10: 'Optimism',
        56: 'BSC',
        43114: 'Avalanche'
      };
      
      const platform = platformMap[chainIdNumber] || 'Ethereum';
      
      // Add account to store
      addAccount({
        id: `wallet-${wallet.name.toLowerCase()}-${Date.now()}`,
        type: 'wallet',
        platform: platform,
        label: `${wallet.name} (${platform})`,
        address: address,
        status: 'connected',
        metadata: {
          walletType: wallet.name,
          chainId: chainIdNumber
        }
      });

      toaster.create({
        title: 'Wallet Connected',
        description: `Connected ${wallet.name}: ${address.slice(0, 6)}...${address.slice(-4)}`,
        type: 'success',
        duration: 5000,
      });
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