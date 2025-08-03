import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { useStore } from '../../store/useStore';

// Mock wallet-integration-system to avoid module resolution issues
vi.mock('@cygnus-wealth/wallet-integration-system', () => ({
  IntegrationSource: {
    METAMASK: 'METAMASK',
    PHANTOM: 'PHANTOM',
    SUIET: 'SUIET',
    COINBASE_WALLET: 'COINBASE_WALLET',
    RABBY: 'RABBY',
  }
}));

// Mock only the createToaster function
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react') as any;
  return {
    ...actual,
    createToaster: () => ({
      create: vi.fn(),
    }),
  };
});

import MultiWalletConnect from './MultiWalletConnect';

const renderMultiWalletConnect = () => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MultiWalletConnect />
    </ChakraProvider>
  );
};

describe('MultiWalletConnect', () => {
  beforeEach(() => {
    // Reset store
    useStore.setState({
      accounts: [],
    });
    
    // Clear window mocks
    (window as any).ethereum = undefined;
    (window as any).solana = undefined;
    (window as any).suiet = undefined;
    (window as any).sui = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Wallet Detection', () => {
    it('should detect EVM wallets', async () => {
      // Mock MetaMask
      (window as any).ethereum = {
        isMetaMask: true,
        request: vi.fn(),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      expect(screen.getByText('MetaMask')).toBeInTheDocument();
    });

    it('should detect Phantom wallet', async () => {
      // Mock Phantom
      (window as any).solana = {
        isPhantom: true,
        connect: vi.fn(),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Phantom')).toBeInTheDocument();
    });

    it('should detect Sui wallet', async () => {
      // Mock Suiet
      (window as any).suiet = {
        requestPermissions: vi.fn(),
        getAccounts: vi.fn(),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Sui Wallet')).toBeInTheDocument();
    });

    it('should show message when no wallets detected', async () => {
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      expect(screen.getByText('No wallets detected. Please install a wallet extension.')).toBeInTheDocument();
    });
  });

  describe('Solana Wallet Connection', () => {
    it('should connect to Phantom wallet', async () => {
      const mockPublicKey = {
        toString: () => '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs'
      };
      
      (window as any).solana = {
        isPhantom: true,
        connect: vi.fn().mockResolvedValue({ publicKey: mockPublicKey }),
      };
      
      renderMultiWalletConnect();
      
      // Open menu
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      // Click Phantom
      const phantomButton = screen.getByText('Phantom');
      
      await act(async () => {
        fireEvent.click(phantomButton);
      });
      
      await waitFor(() => {
        expect(window.solana.connect).toHaveBeenCalled();
      });
      
      // Check if account was added to store
      const accounts = useStore.getState().accounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].platform).toBe('Solana');
      expect(accounts[0].address).toBe('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs');
    });

    it('should handle Phantom connection errors', async () => {
      (window as any).solana = {
        isPhantom: true,
        connect: vi.fn().mockRejectedValue(new Error('User rejected connection')),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      const phantomButton = screen.getByText('Phantom');
      
      await act(async () => {
        fireEvent.click(phantomButton);
      });
      
      await waitFor(() => {
        expect(window.solana.connect).toHaveBeenCalled();
      });
      
      // Should not add any accounts
      expect(useStore.getState().accounts).toHaveLength(0);
    });
  });

  describe('SUI Wallet Connection', () => {
    it('should connect to Sui wallet', async () => {
      const mockAccounts = ['0x123...abc', '0x456...def'];
      
      (window as any).suiet = {
        requestPermissions: vi.fn().mockResolvedValue(true),
        getAccounts: vi.fn().mockResolvedValue(mockAccounts),
      };
      
      renderMultiWalletConnect();
      
      // Open menu
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      // Click Sui Wallet
      const suiButton = screen.getByText('Sui Wallet');
      
      await act(async () => {
        fireEvent.click(suiButton);
      });
      
      await waitFor(() => {
        expect(window.suiet.requestPermissions).toHaveBeenCalled();
        expect(window.suiet.getAccounts).toHaveBeenCalled();
      });
      
      // Check if accounts were added to store
      const accounts = useStore.getState().accounts;
      expect(accounts).toHaveLength(2);
      expect(accounts[0].platform).toBe('SUI');
      expect(accounts[0].address).toBe('0x123...abc');
      expect(accounts[1].address).toBe('0x456...def');
    });

    it('should handle Sui wallet without accounts', async () => {
      (window as any).suiet = {
        requestPermissions: vi.fn().mockResolvedValue(true),
        getAccounts: vi.fn().mockResolvedValue([]),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      const suiButton = screen.getByText('Sui Wallet');
      
      await act(async () => {
        fireEvent.click(suiButton);
      });
      
      await waitFor(() => {
        expect(window.suiet.getAccounts).toHaveBeenCalled();
      });
      
      // Should not add any accounts
      expect(useStore.getState().accounts).toHaveLength(0);
    });
  });

  describe('EVM Wallet Connection', () => {
    it('should connect to MetaMask with multiple chains', async () => {
      const mockAccounts = ['0x742d35Cc6634C0532925a3b844Bc9e7595f6fED2'];
      
      const mockRequest = vi.fn();
      // Setup request mock with proper chain responses
      mockRequest
        .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
        .mockResolvedValueOnce('0x1') // eth_chainId
        .mockResolvedValueOnce(null) // wallet_switchEthereumChain for Ethereum
        .mockRejectedValueOnce({ code: 4902 }) // Polygon not configured
        .mockRejectedValueOnce({ code: 4902 }) // BSC not configured  
        .mockRejectedValueOnce({ code: 4902 }) // Arbitrum not configured
        .mockRejectedValueOnce({ code: 4902 }) // Optimism not configured
        .mockRejectedValueOnce({ code: 4902 }) // Avalanche not configured
        .mockRejectedValueOnce({ code: 4902 }) // Base not configured
        .mockResolvedValueOnce(null); // Switch back to original chain
      
      (window as any).ethereum = {
        isMetaMask: true,
        request: mockRequest,
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      const metamaskButton = screen.getByText('MetaMask');
      
      await act(async () => {
        fireEvent.click(metamaskButton);
        // Wait for the connection to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
      });
      
      // Check if account was added
      const accounts = useStore.getState().accounts;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].platform).toBe('Multi-Chain EVM');
      expect(accounts[0].address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f6fED2');
    });
  });

  describe('Loading State', () => {
    it('should show loading state during connection', async () => {
      let connectResolve: any;
      const connectPromise = new Promise(resolve => {
        connectResolve = resolve;
      });
      
      (window as any).solana = {
        isPhantom: true,
        connect: vi.fn().mockReturnValue(connectPromise),
      };
      
      renderMultiWalletConnect();
      
      const button = screen.getByText('Multi-Chain Connect');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText('Select Wallet')).toBeInTheDocument();
      });
      
      const phantomButton = screen.getByText('Phantom');
      
      // Click without await to capture loading state
      fireEvent.click(phantomButton);
      
      // The button should show loading state now
      await waitFor(() => {
        // When loading, the button text changes to "Connecting..."
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
      
      // Resolve the connection to clean up
      connectResolve({ publicKey: { toString: () => 'test-key' } });
    });
  });
});