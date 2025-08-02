import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Button,
  Heading,
  Spinner,
  Table,
  Badge,
  Flex,
  IconButton,
  Grid,
  Stat,
  Tooltip
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiPlus, FiEye, FiEyeOff } from 'react-icons/fi';
import { useStore } from '../store/useStore';
import { useAccountSync } from '../hooks/useAccountSync';
import type { Asset } from '../store/useStore';

const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  
  // Get data from global store
  const { 
    accounts, 
    assets, 
    portfolio, 
    isLoading 
  } = useStore();
  
  // Sync account balances
  useAccountSync();
  
  // Get connected accounts count
  const connectedAccounts = accounts.filter(acc => acc.status === 'connected').length;

  // Aggregate assets by symbol and chain
  const aggregatedAssets = useMemo(() => {
    const assetMap = new Map<string, {
      asset: Asset;
      addresses: Set<string>;
      totalBalance: number;
      totalValue: number;
      accountInfo?: { accountCount: number; walletType: string };
    }>();

    assets.forEach(asset => {
      const key = `${asset.symbol}-${asset.chain}`;
      const existing = assetMap.get(key);
      const balance = parseFloat(asset.balance);
      const value = asset.valueUsd || 0;
      const address = asset.metadata?.address || '';

      if (existing) {
        existing.addresses.add(address);
        existing.totalBalance += balance;
        existing.totalValue += value;
        existing.asset.balance = existing.totalBalance.toString();
        existing.asset.valueUsd = existing.totalValue;
      } else {
        // Get the account to check if it's multi-account
        const account = accounts.find(acc => acc.id === asset.accountId);
        const accountCount = account?.metadata?.accountCount || 1;
        const walletType = account?.metadata?.walletType || 'Wallet';
        
        assetMap.set(key, {
          asset: {
            ...asset,
            balance: balance.toString(),
            valueUsd: value
          },
          addresses: new Set([address]),
          totalBalance: balance,
          totalValue: value,
          accountInfo: { accountCount, walletType }
        });
      }
    });

    return Array.from(assetMap.values());
  }, [assets, accounts]);

  // Filter assets based on zero balance preference
  const filteredAssets = showZeroBalances 
    ? aggregatedAssets 
    : aggregatedAssets.filter(item => item.totalBalance > 0);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAssets = filteredAssets.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  const handleZeroBalanceChange = (checked: boolean) => {
    setShowZeroBalances(checked);
    setCurrentPage(1);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack gap={8}>
        <Box textAlign="center">
          <Heading as="h1" size="4xl" mb={2}>
            Portfolio Dashboard
          </Heading>
          <Text color="gray.600">
            Your complete crypto portfolio overview
          </Text>
        </Box>

        {/* Portfolio Summary - Always visible */}
        <Box p={6} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" shadow="sm">
          <Stack gap={4}>
            <Heading as="h2" size="lg" color="gray.800">
              Portfolio Summary
            </Heading>
            
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <Stat.Root>
                <Stat.Label color="gray.600">Total Portfolio Value</Stat.Label>
                <Stat.ValueText fontSize="3xl">
                  ${portfolio.totalValue.toFixed(2)}
                </Stat.ValueText>
                <Stat.HelpText>USD</Stat.HelpText>
              </Stat.Root>
              
              <Stat.Root>
                <Stat.Label color="gray.600">Total Assets</Stat.Label>
                <Stat.ValueText fontSize="3xl">
                  {portfolio.totalAssets}
                </Stat.ValueText>
                <Stat.HelpText>Across all accounts</Stat.HelpText>
              </Stat.Root>
              
              <Stat.Root>
                <Stat.Label color="gray.600">Connected Accounts</Stat.Label>
                <Stat.ValueText fontSize="3xl">
                  {connectedAccounts}
                </Stat.ValueText>
                <Stat.HelpText>
                  <Button as={Link} to="/settings/accounts" size="sm" variant="link" colorScheme="blue">
                    {connectedAccounts === 0 ? 'Add accounts' : 'Manage'}
                  </Button>
                </Stat.HelpText>
              </Stat.Root>
            </Grid>
          </Stack>
        </Box>

        {/* Assets Table - Always visible */}
        <Box p={6} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" shadow="sm" position="relative">
          <Stack gap={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Heading as="h2" size="lg" color="gray.800">
                Assets
              </Heading>
              <Flex align="center" gap={4}>
                <Flex align="center" gap={2}>
                  <Box as={showZeroBalances ? FiEye : FiEyeOff} color="gray.600" />
                  <Text fontSize="sm" color="gray.600">
                    Show zero balances
                  </Text>
                  <input
                    type="checkbox"
                    checked={showZeroBalances}
                    onChange={(e) => handleZeroBalanceChange(e.target.checked)}
                    style={{
                      marginLeft: '8px',
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                </Flex>
                {isLoading && <Spinner size="sm" color="blue.500" />}
              </Flex>
            </Box>

            <Box overflowX="auto" position="relative" minH="300px">
              <Table.Root variant="line">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Asset</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Balance</Table.ColumnHeader>
                    <Table.ColumnHeader>Source</Table.ColumnHeader>
                    <Table.ColumnHeader>Chain</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Price (USD)</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Value (USD)</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredAssets.length > 0 ? (
                    currentAssets.map((item) => {
                      const { asset, addresses, accountInfo } = item;
                      const addressArray = Array.from(addresses);
                      const showTooltip = addressArray.length > 1;
                      
                      // Format source to show account count
                      const sourceLabel = accountInfo && addressArray.length > 1
                        ? `${accountInfo.walletType} (${addressArray.length} accounts)`
                        : asset.source;
                      
                      return (
                        <Table.Row key={asset.id}>
                          <Table.Cell>
                            <Stack gap={0}>
                              <Text fontWeight="semibold">{asset.symbol}</Text>
                              <Text fontSize="sm" color="gray.600">{asset.name}</Text>
                            </Stack>
                          </Table.Cell>
                          <Table.Cell textAlign="right" fontFamily="mono">
                            {asset.balance}
                          </Table.Cell>
                          <Table.Cell>
                            {showTooltip ? (
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <Badge 
                                    colorScheme="blue" 
                                    variant="subtle" 
                                    cursor="pointer"
                                    style={{ textDecoration: 'underline dotted' }}
                                  >
                                    {sourceLabel}
                                  </Badge>
                                </Tooltip.Trigger>
                                <Tooltip.Positioner>
                                  <Tooltip.Content>
                                    <Box p={2}>
                                      <Text fontSize="xs" fontWeight="semibold" mb={1}>
                                        Accounts ({addressArray.length}):
                                      </Text>
                                      {addressArray.map((addr, idx) => (
                                        <Text key={idx} fontSize="xs" fontFamily="mono">
                                          {addr.slice(0, 6)}...{addr.slice(-4)}
                                        </Text>
                                      ))}
                                    </Box>
                                  </Tooltip.Content>
                                </Tooltip.Positioner>
                              </Tooltip.Root>
                            ) : (
                              <Badge colorScheme="blue" variant="subtle">
                                {sourceLabel}
                              </Badge>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorScheme="purple" variant="subtle">
                              {asset.chain}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            ${asset.priceUsd?.toFixed(2) || '-'}
                          </Table.Cell>
                          <Table.Cell textAlign="right" fontWeight="semibold">
                            ${asset.valueUsd?.toFixed(2) || '-'}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={6} textAlign="center" py={20}>
                        <Stack gap={4} align="center">
                          <Box
                            p={4}
                            bg="gray.50"
                            borderRadius="full"
                            color="gray.400"
                          >
                            <FiPlus size={32} />
                          </Box>
                          <Text fontSize="lg" color="gray.600">
                            No assets to display
                          </Text>
                          <Text color="gray.500">
                            Add accounts to start tracking your portfolio
                          </Text>
                          <Button
                            as={Link}
                            to="/settings/accounts"
                            colorScheme="blue"
                            leftIcon={<FiPlus />}
                          >
                            Go to Settings → Accounts
                          </Button>
                        </Stack>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Flex justify="space-between" align="center" mt={4}>
                <Text fontSize="sm" color="gray.600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} assets
                  {!showZeroBalances && assets.length > filteredAssets.length && (
                    <Text as="span" color="gray.500">
                      {' '}({assets.length - filteredAssets.length} hidden)
                    </Text>
                  )}
                </Text>
                <Stack direction="row" spacing={2}>
                  <IconButton
                    aria-label="Previous page"
                    icon={<FiChevronLeft />}
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                  <Button size="sm" variant="outline">
                    {currentPage} / {totalPages}
                  </Button>
                  <IconButton
                    aria-label="Next page"
                    icon={<FiChevronRight />}
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  />
                </Stack>
              </Flex>
            )}
          </Stack>
        </Box>

      </Stack>
    </Container>
  );
}