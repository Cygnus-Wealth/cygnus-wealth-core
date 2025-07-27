import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Balance } from '@cygnus-wealth/data-models';

export interface Account {
  id: string;
  type: 'wallet' | 'cex' | 'dex';
  platform: string;
  label: string;
  address?: string;
  apiKey?: string; // Encrypted
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  balances?: Balance[];
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  source: string;
  chain: string;
  accountId: string;
  priceUsd: number | null;
  valueUsd: number | null;
}

export interface PortfolioState {
  totalValue: number;
  totalAssets: number;
  lastUpdated: string | null;
}

interface AppState {
  // Accounts
  accounts: Account[];
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  getAccountById: (id: string) => Account | undefined;
  
  // Assets
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  getAssetsByAccount: (accountId: string) => Asset[];
  
  // Portfolio
  portfolio: PortfolioState;
  updatePortfolio: (updates: Partial<PortfolioState>) => void;
  calculateTotalValue: () => void;
  
  // Prices
  prices: Record<string, number>;
  updatePrice: (symbol: string, price: number) => void;
  
  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      assets: [],
      portfolio: {
        totalValue: 0,
        totalAssets: 0,
        lastUpdated: null,
      },
      prices: {},
      isLoading: false,
      error: null,

      // Account actions
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, ...updates } : acc
          ),
        })),

      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
          assets: state.assets.filter((asset) => asset.accountId !== id),
        })),

      getAccountById: (id) => {
        const state = get();
        return state.accounts.find((acc) => acc.id === id);
      },

      // Asset actions
      setAssets: (assets) => set({ assets }),

      addAsset: (asset) =>
        set((state) => ({
          assets: [...state.assets, asset],
        })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((asset) =>
            asset.id === id ? { ...asset, ...updates } : asset
          ),
        })),

      removeAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== id),
        })),

      getAssetsByAccount: (accountId) => {
        const state = get();
        return state.assets.filter((asset) => asset.accountId === accountId);
      },

      // Portfolio actions
      updatePortfolio: (updates) =>
        set((state) => ({
          portfolio: { ...state.portfolio, ...updates },
        })),

      calculateTotalValue: () => {
        const state = get();
        const totalValue = state.assets.reduce(
          (sum, asset) => sum + (asset.valueUsd || 0),
          0
        );
        const totalAssets = state.assets.length;

        set({
          portfolio: {
            totalValue,
            totalAssets,
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      // Price actions
      updatePrice: (symbol, price) =>
        set((state) => ({
          prices: { ...state.prices, [symbol]: price },
        })),

      // UI State actions
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'cygnus-wealth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist accounts and user preferences
        accounts: state.accounts.map(acc => ({
          ...acc,
          apiKey: acc.apiKey, // In production, this should be encrypted
        })),
        // Don't persist assets or prices as they should be fresh
      }),
    }
  )
);