import { useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Input,
  Button,
  Heading,
  Spinner,
  createToaster
} from '@chakra-ui/react';
import { Formik, Form, Field } from 'formik';
import * as yup from 'yup';
import { 
  useEvmBalanceRealTime, 
  useEvmTransactionMonitor,
  ConnectionManager,
  type ConnectionStatus
} from '@cygnus-wealth/evm-integration';

import {
  type Transaction
} from '@cygnus-wealth/data-models';


const addressValidationSchema = yup.object({
  address: yup
    .string()
    .required('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address')
});

const toaster = createToaster({
  placement: 'top'
});

// Create a singleton connection manager instance
const connectionManager = new ConnectionManager();

export default function Dashboard() {
  const [trackedAddress, setTrackedAddress] = useState<string | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<number, ConnectionStatus>>(new Map());

  // Real-time balance hook
  const {
    balance,
    isLoading,
    error,
    isConnected
  } = useEvmBalanceRealTime(
    trackedAddress as `0x${string}` | undefined,
    1, // Ethereum mainnet
    {
      enabled: !!trackedAddress
    }
  );

  // Transaction monitoring
  const { transactions } = useEvmTransactionMonitor(
    trackedAddress as `0x${string}` | undefined,
    1,
    {
      enabled: !!trackedAddress
    }
  );

  // Monitor connection status
  useState(() => {
    const unsubscribe = connectionManager.onStatusChange((status: ConnectionStatus) => {
      setConnectionStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(status.chainId, status);
        return newMap;
      });
    });
    return unsubscribe;
  });

  const handleAddressSubmit = async (values: { address: string }) => {
    setTrackedAddress(values.address);
    
    toaster.create({
      title: 'Tracking Started',
      description: `Now monitoring ${values.address}`,
      type: 'success',
      duration: 3000
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack gap={8}>
        <Box textAlign="center">
          <Heading as="h1" size="4xl" mb={2}>
            Portfolio Dashboard
          </Heading>
          <Text color="gray.600" mb={2}>
            Enter an EVM wallet address to track your portfolio in real-time
          </Text>
          
          {/* Connection Status */}
          <Box display="flex" justifyContent="center" alignItems="center" gap={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                w={3}
                h={3}
                borderRadius="full"
                bg={isConnected ? "green.500" : "red.500"}
              />
              <Text fontSize="sm" color={isConnected ? "green.600" : "red.600"}>
                {isConnected ? "Connected to Ethereum" : "Disconnected"}
              </Text>
            </Box>
            
            {connectionStatuses.get(1)?.lastConnected && (
              <Text fontSize="sm" color="gray.500">
                Connected at: {new Date(connectionStatuses.get(1)?.lastConnected || 0).toLocaleTimeString()}
              </Text>
            )}
          </Box>
        </Box>

        <Box p={6} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
          <Heading as="h2" size="lg" mb={4}>
            Wallet Address
          </Heading>
          
          <Formik
            initialValues={{ address: '' }}
            validationSchema={addressValidationSchema}
            onSubmit={handleAddressSubmit}
          >
            {({ errors, touched, isValid, dirty }) => (
              <Form>
                <Stack gap={4}>
                  <Field name="address">
                    {({ field }: any) => (
                      <Input
                        {...field}
                        placeholder="0x742D35Cc6634C0532925a3b8D404fEdBE87C2F0f"
                        size="lg"
                        bg="white"
                        color="black"
                        _placeholder={{ color: "gray.500" }}
                      />
                    )}
                  </Field>
                  {errors.address && touched.address && (
                    <Box p={3} bg="red.100" borderRadius="md" color="red.800">
                      {errors.address}
                    </Box>
                  )}
                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    loading={isLoading}
                    disabled={!isValid || !dirty}
                    width="full"
                  >
                    {isLoading ? 'Fetching Balance...' : 'Track Wallet'}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </Box>

        {/* Error Display */}
        {error && (
          <Box p={4} bg="red.100" borderRadius="md" color="red.800">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error.message}</Text>
          </Box>
        )}

        {/* Balance Display */}
        {balance && (
          <Box p={6} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" shadow="sm">
            <Stack gap={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading as="h2" size="lg">
                  Real-Time Balance
                </Heading>
                {isLoading && <Spinner size="sm" />}
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Address
                </Text>
                <Text fontSize="md" fontFamily="mono" wordBreak="break-all">
                  {trackedAddress}
                </Text>
              </Box>

              <Stack direction="row" gap={8} justify="space-around">
                <Box textAlign="center">
                  <Text fontSize="sm" color="gray.600">ETH Balance</Text>
                  <Text fontSize="3xl" fontWeight="bold">
                    {balance.amount} {balance.asset?.symbol || 'ETH'}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Last updated: {new Date().toLocaleTimeString()}
                  </Text>
                </Box>

                <Box textAlign="center">
                  <Text fontSize="sm" color="gray.600">Network Status</Text>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
                    {isConnected && (
                      <Box w={2} h={2} borderRadius="full" bg="green.400" />
                    )}
                    <Text fontSize="sm" color="gray.500">
                      WebSocket Connected
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="gray.400">
                    Updates on every block
                  </Text>
                </Box>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Box p={6} bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" shadow="sm">
            <Heading as="h3" size="md" mb={4}>
              Recent Transactions
            </Heading>
            <Stack gap={3}>
              {transactions.slice(0, 5).map((tx: Transaction) => (
                <Box 
                  key={tx.id || tx.hash} 
                  p={3} 
                  bg="gray.50" 
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Text fontSize="sm" fontFamily="mono">
                        {tx.hash ? `${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}` : tx.id}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {tx.from === trackedAddress ? 'Outgoing' : 'Incoming'}
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm" fontWeight="bold">
                        {tx.assets_out?.[0]?.amount || tx.assets_in?.[0]?.amount || '0'} 
                        {tx.assets_out?.[0]?.asset.symbol || tx.assets_in?.[0]?.asset.symbol || 'ETH'}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Status Footer */}
        {trackedAddress && (
          <Box textAlign="center">
            <Text fontSize="sm" color="gray.500">
              Real-time updates via WebSocket events • Zero polling • Instant notifications
            </Text>
          </Box>
        )}
      </Stack>
    </Container>
  );
}