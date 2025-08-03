import {
  Container,
  Stack,
  Heading,
  Text,
  Box,
  Button,
  Badge,
  Flex,
  IconButton,
  Grid,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiKey, FiChevronRight } from 'react-icons/fi';
import { SiEthereum, SiSolana, SiBinance } from 'react-icons/si';
import { useStore } from '../../store/useStore';
import { useState } from 'react';
import AddAccountModal from './AddAccountModal';
import TokenManager from './TokenManager';
import MultiWalletConnect from './MultiWalletConnect';
import WalletDiagnostics from './WalletDiagnostics';

// Platform icon mapping
const platformIcons: Record<string, React.ElementType> = {
  'Ethereum': SiEthereum,
  'Polygon': SiEthereum, // Using ETH icon for now
  'Arbitrum': SiEthereum,
  'Optimism': SiEthereum,
  'Solana': SiSolana,
  'Binance': SiBinance,
};

export default function Accounts() {
  const { accounts, updateAccount, removeAccount } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  const getStatusColor = (status: 'connected' | 'disconnected' | 'error') => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getAccountTypeLabel = (type: 'wallet' | 'cex' | 'dex') => {
    switch (type) {
      case 'wallet':
        return 'Wallet';
      case 'cex':
        return 'Exchange';
      case 'dex':
        return 'DEX';
      default:
        return type;
    }
  };

  const handleAddAccount = () => {
    setIsModalOpen(true);
  };

  const handleConnect = (accountId: string) => {
    updateAccount(accountId, { status: 'connected', lastSync: new Date().toISOString() });
  };

  const handleDisconnect = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // If this account uses WalletManager, disconnect through it
    if (account.metadata?.useWalletManager) {
      const walletManager = (window as any).__cygnusWalletManager as any;
      if (walletManager && account.metadata?.walletManagerId) {
        try {
          // Find all accounts with the same walletManagerId
          const relatedAccounts = accounts.filter(
            acc => acc.metadata?.walletManagerId === account.metadata?.walletManagerId
          );
          
          // Disconnect all chains for this wallet
          const { Chain } = await import('@cygnus-wealth/wallet-integration-system');
          const chains = [
            Chain.ETHEREUM,
            Chain.POLYGON,
            Chain.BSC,
            Chain.ARBITRUM,
            Chain.OPTIMISM,
            Chain.AVALANCHE,
            Chain.BASE
          ];
          
          for (const chain of chains) {
            try {
              await walletManager.disconnectWallet(chain);
            } catch {
              // Chain might not be connected, ignore
            }
          }
          
          // Update all related accounts to disconnected
          relatedAccounts.forEach(acc => {
            updateAccount(acc.id, { status: 'disconnected' });
          });
          
          return;
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
        }
      }
    }
    
    // Fallback to simple status update
    updateAccount(accountId, { status: 'disconnected' });
  };

  const handleDelete = async (accountId: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;
      
      // If this is the last account for a wallet using WalletManager, disconnect it
      if (account.metadata?.useWalletManager && account.metadata?.walletManagerId) {
        const relatedAccounts = accounts.filter(
          acc => acc.metadata?.walletManagerId === account.metadata?.walletManagerId
        );
        
        if (relatedAccounts.length === 1) {
          // This is the last account, disconnect the wallet
          await handleDisconnect(accountId);
        }
      }
      
      removeAccount(accountId);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack gap={8}>
        {/* Header */}
        <Box>
          <Flex align="center" gap={4} mb={2}>
            <IconButton
              as={Link}
              to="/settings"
              aria-label="Back to Settings"
              icon={<FiArrowLeft />}
              variant="ghost"
              size="sm"
            />
            <Heading as="h1" size="3xl">
              Accounts
            </Heading>
          </Flex>
          <Text color="gray.600" ml={12}>
            Manage your connected wallets, exchanges, and API keys
          </Text>
        </Box>

        {/* Add Account Actions */}
        <Box>
          <Stack direction="row" spacing={4} wrap="wrap">
            <MultiWalletConnect />
            <Button
              leftIcon={<FiPlus />}
              variant="outline"
              colorScheme="gray"
              onClick={handleAddAccount}
            >
              Add Manually
            </Button>
            <WalletDiagnostics />
          </Stack>
        </Box>

        {/* Summary Section */}
        {accounts.length > 0 && (
          <Box
            p={4}
            bg="blue.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="blue.200"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              bg: 'blue.100',
              borderColor: 'blue.300',
            }}
            onClick={() => navigate('/settings/wallet-details')}
          >
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="sm" color="blue.700" fontWeight="semibold">
                  Wallet Overview
                </Text>
                <Text fontSize="lg" color="blue.900">
                  {/* Count unique connections */}
                  {new Set(accounts.filter(acc => acc.type === 'wallet').map(acc => acc.metadata?.connectionType || acc.metadata?.walletType)).size} connection{new Set(accounts.filter(acc => acc.type === 'wallet').map(acc => acc.metadata?.connectionType || acc.metadata?.walletType)).size !== 1 ? 's' : ''} • {' '}
                  {/* Count unique wallets */}
                  {new Set(accounts.filter(acc => acc.type === 'wallet').map(acc => acc.metadata?.walletId)).size} wallet{new Set(accounts.filter(acc => acc.type === 'wallet').map(acc => acc.metadata?.walletId)).size !== 1 ? 's' : ''} • {' '}
                  {/* Count total accounts */}
                  {accounts.filter(acc => acc.type === 'wallet').length} account{accounts.filter(acc => acc.type === 'wallet').length !== 1 ? 's' : ''}
                </Text>
              </Box>
              <Box color="blue.600">
                <FiChevronRight size={24} />
              </Box>
            </Flex>
          </Box>
        )}

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <Box p={8} bg="gray.50" borderRadius="lg" textAlign="center">
            <Text fontSize="lg" color="gray.600" mb={4}>
              No accounts added yet
            </Text>
            <Text color="gray.500" mb={4}>
              Add your first account to start tracking your portfolio
            </Text>
          </Box>
        ) : (
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
            {accounts.map((account) => {
            const Icon = platformIcons[account.platform] || SiEthereum;
            
            return (
              <Box
                key={account.id}
                p={6}
                bg="white"
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                shadow="sm"
                transition="all 0.2s"
                _hover={{
                  shadow: 'md',
                  borderColor: 'gray.300',
                }}
              >
                <Stack gap={4}>
                  {/* Account Header */}
                  <Flex justify="space-between" align="flex-start">
                    <Flex gap={3} align="center">
                      <Box
                        p={2}
                        bg="gray.100"
                        borderRadius="lg"
                        color="gray.700"
                      >
                        <Icon size={24} />
                      </Box>
                      <Box>
                        <Flex align="center" gap={2}>
                          <Text fontWeight="semibold" fontSize="lg">
                            {account.label}
                          </Text>
                          <Badge
                            colorScheme={getStatusColor(account.status)}
                            size="sm"
                          >
                            {account.status}
                          </Badge>
                        </Flex>
                        <Text fontSize="sm" color="gray.600">
                          {account.metadata?.connectionType || account.metadata?.walletType || account.platform} • {getAccountTypeLabel(account.type)}
                        </Text>
                      </Box>
                    </Flex>
                    
                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        aria-label="Edit account"
                        variant="ghost"
                        size="sm"
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        aria-label="Delete account"
                        variant="ghost"
                        size="sm"
                        color="red.500"
                        onClick={() => handleDelete(account.id)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Stack>
                  </Flex>

                  {/* Account Details */}
                  <Stack spacing={2}>
                    {account.address && (
                      <Flex align="center" gap={2}>
                        <Text fontSize="sm" color="gray.600">
                          Address:
                        </Text>
                        <Text fontSize="sm" fontFamily="mono">
                          {account.address}
                        </Text>
                      </Flex>
                    )}
                    
                    {account.type === 'cex' && (
                      <Flex align="center" gap={2}>
                        <FiKey size={14} color="gray" />
                        <Text fontSize="sm" color="gray.600">
                          API Key configured
                        </Text>
                      </Flex>
                    )}

                    {account.lastSync && account.status === 'connected' && (
                      <Text fontSize="sm" color="gray.500">
                        Last synced: {account.lastSync}
                      </Text>
                    )}
                    
                    {/* Show connected chains */}
                    {account.metadata?.detectedChains && account.metadata.detectedChains.length > 0 && (
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>
                          Connected chains:
                        </Text>
                        <Flex gap={1} flexWrap="wrap">
                          {account.metadata.detectedChains.map((chain) => (
                            <Badge key={chain} size="sm" colorScheme="blue">
                              {chain}
                            </Badge>
                          ))}
                        </Flex>
                      </Box>
                    )}
                  </Stack>

                  {/* Token Manager for wallet accounts */}
                  {account.type === 'wallet' && 
                   account.status === 'connected' && (
                    <Box pt={4} borderTop="1px solid" borderColor="gray.200">
                      {account.platform === 'Multi-Chain EVM' ? (
                        <Box>
                          <Text fontSize="sm" color="gray.600" mb={2}>
                            <strong>Note:</strong> Token detection for multi-chain wallets is currently limited. 
                            Only native tokens (ETH, MATIC, BNB, etc.) are automatically detected.
                          </Text>
                          <Text fontSize="sm" color="blue.600">
                            To track ERC20 tokens, please add individual chain accounts using the "Add Manually" button.
                          </Text>
                        </Box>
                      ) : (
                        <TokenManager accountId={account.id} platform={account.platform} />
                      )}
                    </Box>
                  )}

                  {/* Connect/Disconnect Button */}
                  <Button
                    variant="outline"
                    colorScheme={account.status === 'connected' ? 'red' : 'blue'}
                    size="sm"
                    w="full"
                    onClick={() => 
                      account.status === 'connected' 
                        ? handleDisconnect(account.id) 
                        : handleConnect(account.id)
                    }
                  >
                    {account.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </Stack>
              </Box>
            );
          })}
          </Grid>
        )}

        {/* Info Box */}
        <Box
          p={4}
          bg="blue.50"
          borderRadius="md"
          border="1px solid"
          borderColor="blue.200"
        >
          <Text fontSize="sm" color="blue.800">
            <strong>Privacy Notice:</strong> All account data is stored locally in your browser
            or encrypted on IPFS. CygnusWealth never has access to your private keys or API secrets.
          </Text>
        </Box>
      </Stack>
      
      <AddAccountModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </Container>
  );
}