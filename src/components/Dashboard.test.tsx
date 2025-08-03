import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import Dashboard from './Dashboard';
import { useStore } from '../store/useStore';
import type { Account, Asset } from '../store/useStore';

// Mock the useAccountSync hook
vi.mock('../hooks/useAccountSync', () => ({
  useAccountSync: vi.fn(),
}));

const renderDashboard = () => {
  return render(
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState({
      accounts: [],
      assets: [],
      portfolio: {
        totalValue: 0,
        totalAssets: 0,
        lastUpdated: null,
      },
      isLoading: false,
      error: null,
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no accounts are connected', () => {
      renderDashboard();
      
      expect(screen.getByText('Portfolio Dashboard')).toBeInTheDocument();
      expect(screen.getByText('No assets to display')).toBeInTheDocument();
      expect(screen.getByText('Add accounts to start tracking your portfolio')).toBeInTheDocument();
      expect(screen.getByText('Go to Settings → Connections')).toBeInTheDocument();
    });

    it('should show zero values in portfolio summary', () => {
      renderDashboard();
      
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Total value
      expect(screen.getAllByText('0')).toHaveLength(2); // Total assets and connected accounts
    });
  });

  describe('With Connected Accounts', () => {
    beforeEach(() => {
      const accounts: Account[] = [
        {
          id: 'account-1',
          type: 'wallet',
          platform: 'Multi-Chain EVM',
          label: 'MetaMask Account 1',
          address: '0x1234567890123456789012345678901234567890',
          status: 'connected',
          metadata: {
            connectionType: 'MetaMask',
            walletId: 'wallet-1',
            detectedChains: ['Ethereum', 'Polygon'],
          },
        },
        {
          id: 'account-2',
          type: 'wallet',
          platform: 'Multi-Chain EVM',
          label: 'MetaMask Account 2',
          address: '0x2345678901234567890123456789012345678901',
          status: 'connected',
          metadata: {
            connectionType: 'MetaMask',
            walletId: 'wallet-1',
            detectedChains: ['Ethereum', 'Polygon'],
          },
        },
      ];

      const assets: Asset[] = [
        {
          id: 'asset-1',
          accountId: 'account-1',
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '1.5',
          chain: 'Ethereum',
          source: 'wallet',
          priceUsd: 2000,
          valueUsd: 3000,
        },
        {
          id: 'asset-2',
          accountId: 'account-2',
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '0.5',
          chain: 'Ethereum',
          source: 'wallet',
          priceUsd: 2000,
          valueUsd: 1000,
        },
        {
          id: 'asset-3',
          accountId: 'account-1',
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '1000',
          chain: 'Ethereum',
          source: 'wallet',
          priceUsd: 1,
          valueUsd: 1000,
        },
      ];

      useStore.setState({
        accounts,
        assets,
        portfolio: {
          totalValue: 5000,
          totalAssets: 3,
          lastUpdated: new Date().toISOString(),
        },
      });
    });

    it('should display portfolio summary correctly', () => {
      renderDashboard();
      
      expect(screen.getByText('$5000.00')).toBeInTheDocument(); // Total value
      expect(screen.getByText('3')).toBeInTheDocument(); // Total assets
      // Use getAllByText to handle multiple "2" texts and check for connected accounts
      const twoTexts = screen.getAllByText('2');
      expect(twoTexts.length).toBeGreaterThan(0); // Connected accounts
    });

    it('should aggregate assets by symbol and connection', () => {
      renderDashboard();
      
      // Check for aggregated ETH
      expect(screen.getByText('ETH')).toBeInTheDocument();
      // Use getAllByText since "2" appears multiple times
      const twoTexts = screen.getAllByText('2');
      expect(twoTexts.length).toBeGreaterThan(0); // Balance (1.5 + 0.5)
      expect(screen.getByText('MetaMask (2 accounts)')).toBeInTheDocument();
      
      // Check for USDC
      expect(screen.getByText('USDC')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should display asset details correctly', () => {
      renderDashboard();
      
      // Check ETH row
      const ethRow = screen.getByText('ETH').closest('tr');
      expect(ethRow).toHaveTextContent('$2000.00'); // Price
      expect(ethRow).toHaveTextContent('$4000.00'); // Total value
      
      // Check USDC row
      const usdcRow = screen.getByText('USDC').closest('tr');
      expect(usdcRow).toHaveTextContent('$1.00'); // Price
      expect(usdcRow).toHaveTextContent('$1000.00'); // Value
    });

    it('should display chain badges', () => {
      renderDashboard();
      
      const chainBadges = screen.getAllByText('Ethereum');
      expect(chainBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Zero Balance Filtering', () => {
    beforeEach(() => {
      const assets: Asset[] = [
        {
          id: 'asset-1',
          accountId: 'account-1',
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '1.5',
          chain: 'Ethereum',
          source: 'wallet',
          priceUsd: 2000,
          valueUsd: 3000,
        },
        {
          id: 'asset-2',
          accountId: 'account-1',
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '0',
          chain: 'Ethereum',
          source: 'wallet',
          priceUsd: 1,
          valueUsd: 0,
        },
      ];

      useStore.setState({
        accounts: [{
          id: 'account-1',
          type: 'wallet',
          platform: 'Ethereum',
          label: 'Test Wallet',
          address: '0x1234',
          status: 'connected',
        }],
        assets,
      });
    });

    it('should hide zero balance assets by default', () => {
      renderDashboard();
      
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.queryByText('USDC')).not.toBeInTheDocument();
    });

    it('should show zero balance assets when checkbox is checked', async () => {
      renderDashboard();
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      // Click checkbox
      await act(async () => {
        checkbox.click();
      });
      
      // Check synchronously after the action
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('USDC')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      useStore.setState({ isLoading: true });
      renderDashboard();
      
      // Chakra UI Spinner might not have role="status", check by class
      const spinner = document.querySelector('.chakra-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have correct links to connections page', () => {
      renderDashboard();
      
      const manageLink = screen.getByText('Add accounts');
      expect(manageLink.closest('a')).toHaveAttribute('href', '/settings/connections');
    });

    it('should show manage link when accounts exist', () => {
      useStore.setState({
        accounts: [{
          id: 'account-1',
          type: 'wallet',
          platform: 'Ethereum',
          label: 'Test Wallet',
          address: '0x1234',
          status: 'connected',
        }],
      });
      
      renderDashboard();
      
      const manageLink = screen.getByText('Manage');
      expect(manageLink.closest('a')).toHaveAttribute('href', '/settings/connections');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create 15 assets to test pagination
      const assets: Asset[] = Array.from({ length: 15 }, (_, i) => ({
        id: `asset-${i}`,
        accountId: 'account-1',
        symbol: `TOKEN${i}`,
        name: `Token ${i}`,
        balance: '100',
        chain: 'Ethereum',
        source: 'wallet',
        priceUsd: 1,
        valueUsd: 100,
      }));

      useStore.setState({
        accounts: [{
          id: 'account-1',
          type: 'wallet',
          platform: 'Ethereum',
          label: 'Test Wallet',
          address: '0x1234',
          status: 'connected',
        }],
        assets,
      });
    });

    it('should show pagination controls when more than 10 items', () => {
      renderDashboard();
      
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
      expect(screen.getByText('Showing 1-10 of 15 assets')).toBeInTheDocument();
    });

    it('should navigate between pages', async () => {
      renderDashboard();
      
      // Should show first 10 items
      expect(screen.getByText('TOKEN0')).toBeInTheDocument();
      expect(screen.queryByText('TOKEN10')).not.toBeInTheDocument();
      
      // Click next page
      const nextButton = screen.getByLabelText('Next page');
      
      await act(async () => {
        nextButton.click();
      });
      
      // Check the results synchronously
      expect(screen.queryByText('TOKEN0')).not.toBeInTheDocument();
      expect(screen.getByText('TOKEN10')).toBeInTheDocument();
    });
  });
});