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

export default function WalletDetails() {
  const { accounts } = useStore();
  
  // Filter only wallet accounts
  const walletAccounts = accounts.filter(acc => acc.type === 'wallet');
  
  // Group accounts by wallet type
  const walletGroups = walletAccounts.reduce((groups, account) => {
    const walletType = account.metadata?.walletType || 'Unknown';
    if (!groups[walletType]) {
      groups[walletType] = [];
    }
    groups[walletType].push(account);
    return groups;
  }, {} as Record<string, typeof walletAccounts>);
  
  // Calculate totals
  const totalWallets = Object.keys(walletGroups).length;
  const totalAccounts = walletAccounts.reduce((sum, acc) => sum + (acc.metadata?.accountCount || 1), 0);
  
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
            {totalWallets} wallet{totalWallets !== 1 ? 's' : ''} • {totalAccounts} total account{totalAccounts !== 1 ? 's' : ''}
          </Text>
        </Box>

        {/* Wallet Groups */}
        <Accordion.Root multiple defaultValue={Object.keys(walletGroups)}>
          {Object.entries(walletGroups).map(([walletType, accounts]) => {
            const Icon = platformIcons['Multi-Chain EVM'] || SiEthereum;
            const totalAccountsInWallet = accounts.reduce((sum, acc) => sum + (acc.metadata?.accountCount || 1), 0);
            
            return (
              <Accordion.Item key={walletType} value={walletType} mb={4}>
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
                        {walletType}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {accounts.length} connection{accounts.length !== 1 ? 's' : ''} • {totalAccountsInWallet} account{totalAccountsInWallet !== 1 ? 's' : ''}
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
                    overflow="hidden"
                  >
                    <Table.Root variant="line">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Connection Label</Table.ColumnHeader>
                          <Table.ColumnHeader>Status</Table.ColumnHeader>
                          <Table.ColumnHeader>Chains</Table.ColumnHeader>
                          <Table.ColumnHeader>Accounts</Table.ColumnHeader>
                          <Table.ColumnHeader>Addresses</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {accounts.map((account) => (
                          <Table.Row key={account.id}>
                            <Table.Cell>{account.label}</Table.Cell>
                            <Table.Cell>
                              <Badge
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
                                {(account.metadata?.detectedChains || []).map((chain) => (
                                  <Badge key={chain} size="sm" colorScheme="purple">
                                    {chain}
                                  </Badge>
                                ))}
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              {account.metadata?.accountCount || 1}
                            </Table.Cell>
                            <Table.Cell>
                              <Stack gap={1}>
                                {(account.metadata?.allAddresses || [account.address]).map((addr, idx) => (
                                  <Text key={idx} fontSize="xs" fontFamily="mono">
                                    {addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-'}
                                  </Text>
                                ))}
                              </Stack>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
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
      </Stack>
    </Container>
  );
}