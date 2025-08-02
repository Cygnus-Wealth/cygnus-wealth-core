import {
  Container,
  Stack,
  Heading,
  Text,
  Box,
  Flex,
  IconButton,
  Table,
  Badge,
  Accordion,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { useStore } from '../../store/useStore';

// Platform icon mapping
const platformIcons: Record<string, React.ElementType> = {
  'Ethereum': SiEthereum,
  'Multi-Chain EVM': SiEthereum,
};

// Helper to abbreviate address
const abbreviateAddress = (address: string) => 
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

interface WalletGroup {
  walletId: string;
  walletLabel: string;
  accounts: any[]; // Will be Account[] from store
}

interface ConnectionGroup {
  connectionType: string;
  wallets: WalletGroup[];
  totalAccounts: number;
}

export default function WalletDetails() {
  const { accounts } = useStore();
  
  // Filter only wallet accounts
  const walletAccounts = accounts.filter(acc => acc.type === 'wallet');
  
  // Group accounts by connection type (MetaMask, Rabby, etc) and then by wallet (mnemonic)
  const connectionGroups = walletAccounts.reduce((groups, account) => {
    const connectionType = account.metadata?.connectionType || account.metadata?.walletType || 'Unknown';
    const walletId = account.metadata?.walletId || account.id; // Fallback to account id if no walletId
    const walletLabel = account.metadata?.walletLabel || `${connectionType} Wallet`;
    
    // Find or create connection group
    let connectionGroup = groups.find(g => g.connectionType === connectionType);
    if (!connectionGroup) {
      connectionGroup = {
        connectionType,
        wallets: [],
        totalAccounts: 0
      };
      groups.push(connectionGroup);
    }
    
    // Find or create wallet group within connection
    let walletGroup = connectionGroup.wallets.find(w => w.walletId === walletId);
    if (!walletGroup) {
      walletGroup = {
        walletId,
        walletLabel,
        accounts: []
      };
      connectionGroup.wallets.push(walletGroup);
    }
    
    // Add account to wallet group
    walletGroup.accounts.push(account);
    connectionGroup.totalAccounts++;
    
    return groups;
  }, [] as ConnectionGroup[]);
  
  // Calculate totals
  const totalConnections = connectionGroups.length;
  const totalWallets = connectionGroups.reduce((sum, conn) => sum + conn.wallets.length, 0);
  const totalAccounts = walletAccounts.length;
  
  return (
    <Container maxW="container.xl" py={8}>
      <Stack gap={8}>
        {/* Header */}
        <Box>
          <Flex align="center" gap={4} mb={2}>
            <IconButton
              as={Link}
              to="/settings/accounts"
              aria-label="Back to Accounts"
              icon={<FiArrowLeft />}
              variant="ghost"
              size="sm"
            />
            <Heading as="h1" size="3xl">
              Wallet Details
            </Heading>
          </Flex>
          <Text color="gray.600" ml={12}>
            {totalConnections} connection{totalConnections !== 1 ? 's' : ''} • {totalWallets} wallet{totalWallets !== 1 ? 's' : ''} • {totalAccounts} account{totalAccounts !== 1 ? 's' : ''}
          </Text>
        </Box>

        {/* Connection Groups */}
        <Accordion.Root multiple defaultValue={connectionGroups.map(g => g.connectionType)}>
          {connectionGroups.map((connectionGroup) => {
            const Icon = platformIcons['Multi-Chain EVM'] || SiEthereum;
            
            return (
              <Accordion.Item key={connectionGroup.connectionType} value={connectionGroup.connectionType} mb={4}>
                <Accordion.ItemTrigger
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  p={4}
                  _hover={{ bg: 'gray.50' }}
                  _expanded={{ bg: 'gray.50', borderBottomRadius: 0 }}
                >
                  <Flex flex="1" align="center" gap={3}>
                    <Box
                      p={2}
                      bg="gray.100"
                      borderRadius="lg"
                      color="gray.700"
                    >
                      <Icon size={24} />
                    </Box>
                    <Box textAlign="left">
                      <Text fontWeight="semibold" fontSize="lg">
                        {connectionGroup.connectionType}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {connectionGroup.wallets.length} wallet{connectionGroup.wallets.length !== 1 ? 's' : ''} • {connectionGroup.totalAccounts} account{connectionGroup.totalAccounts !== 1 ? 's' : ''}
                      </Text>
                    </Box>
                  </Flex>
                  <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                
                <Accordion.ItemContent>
                  <Box
                    bg="white"
                    border="1px solid"
                    borderTop="none"
                    borderColor="gray.200"
                    borderBottomRadius="lg"
                    p={4}
                  >
                    {/* Wallets within this connection */}
                    <Accordion.Root multiple defaultValue={connectionGroup.wallets.map(w => w.walletId)}>
                      {connectionGroup.wallets.map((walletGroup) => (
                        <Accordion.Item key={walletGroup.walletId} value={walletGroup.walletId} mb={3}>
                          <Accordion.ItemTrigger
                            bg="gray.50"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="md"
                            p={3}
                            _hover={{ bg: 'gray.100' }}
                            _expanded={{ bg: 'gray.100', borderBottomRadius: 0 }}
                          >
                            <Flex flex="1" align="center" gap={3}>
                              <Box textAlign="left">
                                <Text fontWeight="medium">
                                  {walletGroup.walletLabel}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {walletGroup.accounts.length} account{walletGroup.accounts.length !== 1 ? 's' : ''}
                                </Text>
                              </Box>
                            </Flex>
                            <Accordion.ItemIndicator />
                          </Accordion.ItemTrigger>
                          
                          <Accordion.ItemContent>
                            <Box
                              bg="white"
                              border="1px solid"
                              borderTop="none"
                              borderColor="gray.200"
                              borderBottomRadius="md"
                              overflow="hidden"
                            >
                              <Table.Root variant="line" size="sm">
                                <Table.Header>
                                  <Table.Row>
                                    <Table.ColumnHeader>Account</Table.ColumnHeader>
                                    <Table.ColumnHeader>Address</Table.ColumnHeader>
                                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                                    <Table.ColumnHeader>Chains</Table.ColumnHeader>
                                  </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                  {walletGroup.accounts.map((account) => (
                                    <Table.Row key={account.id}>
                                      <Table.Cell>{account.label}</Table.Cell>
                                      <Table.Cell fontFamily="mono">
                                        {abbreviateAddress(account.address || '')}
                                      </Table.Cell>
                                      <Table.Cell>
                                        <Badge
                                          size="sm"
                                          colorScheme={
                                            account.status === 'connected' ? 'green' :
                                            account.status === 'error' ? 'red' : 'gray'
                                          }
                                        >
                                          {account.status}
                                        </Badge>
                                      </Table.Cell>
                                      <Table.Cell>
                                        <Flex gap={1} flexWrap="wrap">
                                          {(account.metadata?.detectedChains || []).slice(0, 3).map((chain) => (
                                            <Badge key={chain} size="sm" colorScheme="purple">
                                              {chain}
                                            </Badge>
                                          ))}
                                          {(account.metadata?.detectedChains || []).length > 3 && (
                                            <Badge size="sm" colorScheme="gray">
                                              +{(account.metadata?.detectedChains || []).length - 3}
                                            </Badge>
                                          )}
                                        </Flex>
                                      </Table.Cell>
                                    </Table.Row>
                                  ))}
                                </Table.Body>
                              </Table.Root>
                            </Box>
                          </Accordion.ItemContent>
                        </Accordion.Item>
                      ))}
                    </Accordion.Root>
                  </Box>
                </Accordion.ItemContent>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>

        {/* Empty State */}
        {walletAccounts.length === 0 && (
          <Box p={8} bg="gray.50" borderRadius="lg" textAlign="center">
            <Text fontSize="lg" color="gray.600" mb={4}>
              No wallets connected yet
            </Text>
            <Text color="gray.500">
              Go back to accounts to connect a wallet
            </Text>
          </Box>
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
            <strong>Note:</strong> Each connection (MetaMask, Rabby, etc.) can contain multiple wallets 
            (different mnemonics or hardware devices), and each wallet can have multiple accounts (addresses). 
            Currently, wallet grouping is estimated as most wallet extensions don't expose which accounts 
            belong to which mnemonic.
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}