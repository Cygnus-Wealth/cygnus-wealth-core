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
import { 
  WalletManager, 
  Chain, 
  IntegrationSource 
} from '@cygnus-wealth/wallet-integration-system';

const toaster = createToaster({
  placement: 'top'
});

interface WalletProvider {
  name: string;
  icon?: string;
  source: IntegrationSource;
  check: () => boolean;
}

const WALLET_PROVIDERS: WalletProvider[] = [
  {
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    source: IntegrationSource.METAMASK,
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isMetaMask) as boolean;
      }
      return window.ethereum?.isMetaMask || false;
    }
  },
  {
    name: 'Rabby',
    icon: 'https://rabby.io/assets/logo.png',
    source: IntegrationSource.RABBY,
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isRabby) as boolean;
      }
      return window.ethereum?.isRabby || false;
    }
  },
  {
    name: 'Coinbase Wallet',
    source: IntegrationSource.COINBASE_WALLET,
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isCoinbaseWallet) as boolean;
      }
      return window.ethereum?.isCoinbaseWallet || false;
    }
  },
  {
    name: 'Brave Wallet',
    source: IntegrationSource.METAMASK, // Brave uses MetaMask-like interface
    check: () => {
      if (window.ethereum?.providers?.length) {
        return window.ethereum.providers.some((p: any) => p.isBraveWallet) as boolean;
      }
      return window.ethereum?.isBraveWallet || false;
    }
  }
];

// EVM chains to connect to
const EVM_CHAINS = [
  { chain: Chain.ETHEREUM, name: 'Ethereum' },
  { chain: Chain.POLYGON, name: 'Polygon' },
  { chain: Chain.BSC, name: 'BSC' },
  { chain: Chain.ARBITRUM, name: 'Arbitrum' },
  { chain: Chain.OPTIMISM, name: 'Optimism' },
  { chain: Chain.AVALANCHE, name: 'Avalanche' },
  { chain: Chain.BASE, name: 'Base' }
];

// Global wallet manager instance
let walletManager: WalletManager | null = null;

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
      // Initialize wallet manager if not already done
      if (!walletManager) {
        walletManager = new WalletManager();
      }

      console.log(`Connecting with ${wallet.name}...`);
      
      // Create a new wallet instance
      const walletInstance = await walletManager.addWallet(wallet.name);
      const walletId = walletInstance.id;
      
      // Connect to each configured chain
      const connectedChains: string[] = [];
      const allAccounts = new Set<string>();
      
      for (const { chain, name } of EVM_CHAINS) {
        try {
          console.log(`Attempting to connect to ${name}...`);
          const connection = await walletManager.connectWallet(chain, wallet.source);
          
          if (connection.connected && connection.accounts) {
            connectedChains.push(name);
            // Collect all unique accounts
            connection.accounts.forEach(acc => allAccounts.add(acc.address));
          }
        } catch (error) {
          // Chain might not be configured in wallet, skip it
          console.log(`Could not connect to ${name}:`, error.message);
        }
      }
      
      if (connectedChains.length === 0) {
        throw new Error('Could not connect to any chains');
      }
      
      const accountArray = Array.from(allAccounts);
      console.log(`Connected to ${connectedChains.length} chains with ${accountArray.length} accounts`);
      
      // Add each account as a separate entry in our store
      accountArray.forEach((address, index) => {
        const accountId = `${walletId}-account-${index}`;
        
        addAccount({
          id: accountId,
          type: 'wallet',
          platform: 'Multi-Chain EVM',
          label: `${wallet.name} Account ${index + 1}`,
          address: address,
          status: 'connected',
          metadata: {
            walletManagerId: walletId,
            chains: connectedChains,
            source: wallet.source,
            walletType: wallet.name,
            detectedChains: connectedChains,
            allAddresses: [address],
            accountCount: 1,
            walletId: walletId,
            connectionType: wallet.name,
            walletLabel: walletInstance.name || `${wallet.name} Wallet`,
            useWalletManager: true // Flag to use WalletManager for fetching
          }
        });
      });
      
      // Store wallet manager reference globally
      (window as any).__cygnusWalletManager = walletManager as any;
      
      toaster.create({
        title: 'Wallet Connected',
        description: `Connected ${accountArray.length} ${wallet.name} account${accountArray.length > 1 ? 's' : ''} across ${connectedChains.length} chain${connectedChains.length > 1 ? 's' : ''}`,
        type: 'success',
        duration: 5000,
      });
    } catch (error) {
      console.error('Connection error:', error);
      
      let message = 'Failed to connect wallet';
      const errorCode = (error as any).code;
      if (errorCode === 4001) {
        message = 'You rejected the connection';
      } else if (errorCode === -32002) {
        message = 'A connection request is already pending. Please check your wallet.';
      } else if ((error as any).message) {
        message = (error as any).message;
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
          Multi-Chain Connect
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