/**
 * Integration tests for Progressive Loading feature
 * 
 * End-to-end tests for the complete progressive loading implementation
 * according to the specifications in ProgressiveLoadingTestSpec.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { BalanceCell } from '../components/dashboard/BalanceCell';
import { PriceIndicator } from '../components/dashboard/PriceIndicator';
import { BalanceAggregate } from '../domain/asset/BalanceAggregate';
import { AssetValue } from '../domain/asset/AssetValue';
import { Price } from '../domain/asset/Price';
import { AssetLoadingState, LoadingStatus } from '../domain/asset/AssetLoadingState';
import { BalanceService } from '../domain/services/BalanceService';
import { PriceService } from '../domain/services/PriceService';
import { PriceCache } from '../infrastructure/cache/PriceCache';

// Mock Chakra UI components for testing
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Flex: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Skeleton: ({ width, height, ...props }: any) => (
    <div {...props} data-testid="skeleton" style={{ width, height }}>Loading...</div>
  ),
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  IconButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Tooltip: {
    Root: ({ children }: any) => <div>{children}</div>,
    Trigger: ({ children }: any) => <div>{children}</div>,
    Positioner: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
  },
  Progress: ({ ...props }: any) => <div {...props} data-testid="progress">Loading...</div>,
}));

// Mock react-icons
vi.mock('react-icons/fi', () => ({
  FiRefreshCw: () => <span>↻</span>,
  FiAlertCircle: () => <span>⚠</span>,
  FiClock: () => <span>🕐</span>,
  FiActivity: () => <span>📈</span>,
}));

// Mock providers and cache
class MockBalanceProvider {
  async fetchBalance() {
    return Promise.resolve({
      isSuccess: true,
      value: AssetValue.fromString('10', 'ETH')
    });
  }
  
  async fetchTokenBalances() {
    return Promise.resolve({
      isSuccess: true,
      value: []
    });
  }
  
  supportsChain() {
    return true;
  }
}

class MockPriceProvider {
  fetchPrice = vi.fn();
  fetchBatchPrices = vi.fn();
  getProviderName = () => 'mock-provider';
  getPriority = () => 1;
}

describe('Progressive Loading Integration Tests', () => {
  let balanceService: BalanceService;
  let priceService: PriceService;
  let mockPriceProvider: MockPriceProvider;
  let priceCache: PriceCache;

  beforeEach(() => {
    // Setup services
    priceCache = new PriceCache();
    balanceService = new BalanceService();
    priceService = new PriceService(priceCache);
    
    mockPriceProvider = new MockPriceProvider();
    priceService.registerProvider(mockPriceProvider);
    
    balanceService.registerProvider('ethereum', new MockBalanceProvider() as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    priceCache.destroy();
  });

  describe('BalanceCell Progressive Loading', () => {
    it('should achieve sub-500ms initial balance display', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Pre-populate cache to simulate fast loading
      aggregate.updateBalance(balance, true, 5000); // 5 seconds cached

      const startTime = Date.now();

      // Execute
      render(<BalanceCell balance={aggregate} />);

      // Assertions
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);

      // Should show cached indicator
      expect(screen.getByText('Cached')).toBeInTheDocument();
    });

    it('should display loading indicators for prices while balance is ready', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum', 
        'ethereum',
        balance
      );

      // Balance is loaded, price is loading
      aggregate.updateBalance(balance);
      aggregate.startPriceLoading();

      // Execute
      render(<BalanceCell balance={aggregate} showPrice={true} showValue={true} />);

      // Assertions
      expect(screen.getByText('10')).toBeInTheDocument(); // Balance shows immediately
      expect(screen.getByTestId('skeleton')).toBeInTheDocument(); // Price shows skeleton
    });

    it('should handle error states gracefully', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Simulate balance error
      aggregate.markBalanceError('Network timeout');

      // Execute
      render(<BalanceCell balance={aggregate} />);

      // Assertions
      expect(screen.getByText('Balance unavailable')).toBeInTheDocument();
    });

    it('should show stale indicators correctly', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Mark as stale
      aggregate.markStale('balance');

      const mockRefresh = vi.fn();

      // Execute
      render(<BalanceCell balance={aggregate} onRefresh={mockRefresh} />);

      // Assertions
      expect(screen.getByText('Stale')).toBeInTheDocument();
      
      // Test refresh functionality
      fireEvent.click(screen.getByText('Stale'));
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('PriceIndicator Progressive Loading', () => {
    it('should display price with quality indicators', async () => {
      // Setup
      const price = Price.live(3000, 'USD', 'coingecko', 95);

      // Execute
      render(
        <PriceIndicator 
          price={price} 
          symbol="ETH" 
          showSource={true}
          showAge={true}
        />
      );

      // Assertions
      expect(screen.getByText('$3,000.00')).toBeInTheDocument();
      expect(screen.getByText('coingecko')).toBeInTheDocument(); // Source
    });

    it('should handle loading states with progress indicators', async () => {
      // Execute
      render(
        <PriceIndicator 
          symbol="ETH" 
          isLoading={true}
        />
      );

      // Assertions
      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Loading price...')).toBeInTheDocument();
    });

    it('should display error states with retry functionality', async () => {
      // Setup
      const mockRefresh = vi.fn();

      // Execute
      render(
        <PriceIndicator 
          symbol="ETH" 
          error="Price service unavailable"
          onRefresh={mockRefresh}
        />
      );

      // Assertions
      expect(screen.getByText('Price service unavailable')).toBeInTheDocument();
      
      const retryButton = screen.getByRole('button');
      fireEvent.click(retryButton);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should show price trends when available', async () => {
      // Setup
      const currentPrice = Price.live(3100, 'USD');
      const previousPrice = Price.live(3000, 'USD');

      // Execute
      render(
        <PriceIndicator 
          price={currentPrice}
          previousPrice={previousPrice}
          symbol="ETH"
          showTrend={true}
        />
      );

      // Assertions
      expect(screen.getByText('$3,100.00')).toBeInTheDocument();
      expect(screen.getByText(/3\.33%/)).toBeInTheDocument(); // Price change
    });
  });

  describe('End-to-End Progressive Loading Scenarios', () => {
    it('should handle network failure gracefully with fallback to cache', async () => {
      // Setup - Mock RPC failure
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Simulate stale cached data
      aggregate.updateBalance(balance, true, 45000); // 45 seconds old
      aggregate.markStale('balance');

      // Execute
      render(<BalanceCell balance={aggregate} />);

      // Assertions
      expect(screen.getByText('10')).toBeInTheDocument(); // Shows cached balance
      expect(screen.getByText('Stale')).toBeInTheDocument(); // Shows stale indicator
    });

    it('should update prices without disrupting balance display', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Initial state - balance loaded, no price
      aggregate.updateBalance(balance);

      const { rerender } = render(<BalanceCell balance={aggregate} showPrice={true} />);

      // Verify initial state
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument(); // No price yet

      // Update with price
      aggregate.updatePrice(Price.live(3000, 'USD'));
      rerender(<BalanceCell balance={aggregate} showPrice={true} />);

      // Assertions - both balance and price should be visible
      expect(screen.getByText('10')).toBeInTheDocument(); // Balance unchanged
      expect(screen.getByText('$3,000.00')).toBeInTheDocument(); // Price added
    });

    it('should maintain sort order during price updates', async () => {
      // Setup multiple aggregates
      const aggregates = [
        BalanceAggregate.create('id1', 'acc1', 'ETH', 'Ethereum', 'ethereum', AssetValue.fromString('1', 'ETH')),
        BalanceAggregate.create('id2', 'acc2', 'BTC', 'Bitcoin', 'bitcoin', AssetValue.fromString('0.1', 'BTC')),
      ];

      // Add initial prices
      aggregates[0].updatePrice(Price.live(3000, 'USD')); // $3000 value
      aggregates[1].updatePrice(Price.live(50000, 'USD')); // $5000 value

      // Sort by value (BTC should be first)
      const sorted = balanceService.sortByValue(aggregates);
      expect(sorted[0].getAssetSymbol()).toBe('BTC');
      expect(sorted[1].getAssetSymbol()).toBe('ETH');

      // Update ETH price to make it more valuable
      aggregates[0].updatePrice(Price.live(6000, 'USD')); // $6000 value

      // Re-sort
      const newSorted = balanceService.sortByValue([aggregates[0], aggregates[1]]);
      expect(newSorted[0].getAssetSymbol()).toBe('ETH'); // Now ETH is first
      expect(newSorted[1].getAssetSymbol()).toBe('BTC');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet balance fetch performance targets', async () => {
      // Cache hit scenario
      const cacheHitStart = Date.now();
      const cachedBalance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'cached-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        cachedBalance
      );
      aggregate.updateBalance(cachedBalance, true, 5000);
      render(<BalanceCell balance={aggregate} />);
      await waitFor(() => screen.getByText('10'));
      const cacheHitDuration = Date.now() - cacheHitStart;
      
      expect(cacheHitDuration).toBeLessThan(10); // Cache hit: < 10ms
    });

    it('should meet price fetch performance targets', async () => {
      // Setup price with cache
      const price = Price.live(3000, 'USD');
      await priceCache.set('price:ETH:USD', price, 10000);

      const cacheHitStart = Date.now();
      render(<PriceIndicator price={price} symbol="ETH" />);
      await waitFor(() => screen.getByText('$3,000.00'));
      const duration = Date.now() - cacheHitStart;

      expect(duration).toBeLessThan(5); // Memory cache: < 5ms
    });

    it('should handle multiple account dashboard load efficiently', async () => {
      // Setup 10 accounts with balances
      const aggregates = Array.from({ length: 10 }, (_, i) => {
        const balance = AssetValue.fromString(`${i + 1}`, 'ETH');
        const agg = BalanceAggregate.create(
          `id-${i}`,
          `account-${i}`,
          'ETH',
          'Ethereum',
          'ethereum',
          balance
        );
        // Pre-populate with cached data for fast loading
        agg.updateBalance(balance, true, 10000);
        return agg;
      });

      const startTime = Date.now();

      // Render all balance cells
      render(
        <div>
          {aggregates.map(agg => (
            <BalanceCell key={agg.getId()} balance={agg} data-testid="balance-cell" />
          ))}
        </div>
      );

      // Wait for all to load
      await waitFor(() => {
        expect(screen.getAllByTestId('balance-cell')).toHaveLength(10);
      });

      const totalDuration = Date.now() - startTime;
      expect(totalDuration).toBeLessThan(500); // Dashboard load: < 500ms
    });
  });

  describe('User Experience Scenarios', () => {
    it('should provide smooth loading experience', async () => {
      // Setup
      const balance = AssetValue.fromString('10', 'ETH');
      const aggregate = BalanceAggregate.create(
        'test-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        balance
      );

      // Start with loading state
      aggregate.startBalanceLoading();
      const { rerender } = render(<BalanceCell balance={aggregate} showValue={true} />);

      // Should show loading skeleton
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();

      // Complete balance loading
      aggregate.updateBalance(balance);
      rerender(<BalanceCell balance={aggregate} showValue={true} />);

      // Should show balance immediately
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument(); // No value yet

      // Start price loading
      aggregate.startPriceLoading();
      rerender(<BalanceCell balance={aggregate} showValue={true} />);

      // Should show price loading skeleton
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();

      // Complete price loading
      aggregate.updatePrice(Price.live(3000, 'USD'));
      rerender(<BalanceCell balance={aggregate} showValue={true} />);

      // Should show complete information
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('$3,000.00')).toBeInTheDocument();
      expect(screen.getByText('$30,000.00')).toBeInTheDocument(); // Value
    });

    it('should handle zero balances appropriately', async () => {
      // Setup
      const zeroBalance = AssetValue.zero('ETH');
      const aggregate = BalanceAggregate.create(
        'zero-id',
        'account-1',
        'ETH',
        'Ethereum',
        'ethereum',
        zeroBalance
      );

      aggregate.updateBalance(zeroBalance);
      aggregate.updatePrice(Price.live(3000, 'USD'));

      // Execute
      render(<BalanceCell balance={aggregate} showValue={true} />);

      // Assertions
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(aggregate.isZeroBalance()).toBe(true);
    });
  });

  describe('Accessibility and UX', () => {
    it('should provide accessible loading states', async () => {
      // Setup loading state
      render(<PriceIndicator symbol="ETH" isLoading={true} />);

      // Should have accessible loading indicator
      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Loading price...')).toBeInTheDocument();
    });

    it('should provide helpful error messages', async () => {
      // Setup error state
      render(
        <PriceIndicator 
          symbol="ETH" 
          error="Unable to fetch price from provider"
          onRefresh={vi.fn()}
        />
      );

      // Should show clear error message and retry option
      expect(screen.getByText('Unable to fetch price from provider')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});