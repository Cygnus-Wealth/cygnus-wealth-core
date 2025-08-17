/**
 * BalanceService
 * 
 * Domain service for fetching and managing asset balances.
 * Handles multi-chain balance fetching with caching and error recovery.
 */

import { AssetValue } from '../asset/AssetValue';
import { BalanceAggregate } from '../asset/BalanceAggregate';
import { Result } from '../shared/Result';
import { DomainError, ServiceError } from '../shared/DomainError';

export interface BalanceFetchRequest {
  accountId: string;
  address: string;
  chain: string;
  assetSymbol?: string; // Optional: fetch specific asset only
  includeTokens?: boolean;
  forceRefresh?: boolean;
}

export interface BalanceFetchResult {
  balances: BalanceAggregate[];
  fromCache: boolean;
  cacheAge?: number;
  fetchDuration: number;
}

export interface IBalanceProvider {
  fetchBalance(
    address: string,
    chain: string,
    assetSymbol?: string
  ): Promise<Result<AssetValue, DomainError>>;
  
  fetchTokenBalances(
    address: string,
    chain: string,
    tokenAddresses?: string[]
  ): Promise<Result<AssetValue[], DomainError>>;
  
  supportsChain(chain: string): boolean;
}

export interface IBalanceCache {
  get(key: string): Promise<{ balance: AssetValue; age: number } | null>;
  set(key: string, balance: AssetValue, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getAge(key: string): Promise<number | null>;
}

export class BalanceService {
  private providers: Map<string, IBalanceProvider> = new Map();
  private cache?: IBalanceCache;
  private defaultTTL = 30000; // 30 seconds

  constructor(cache?: IBalanceCache) {
    this.cache = cache;
  }

  /**
   * Register a balance provider for a chain
   */
  public registerProvider(chain: string, provider: IBalanceProvider): void {
    this.providers.set(chain.toLowerCase(), provider);
  }

  /**
   * Fetch balances for an account
   */
  public async fetchBalances(
    request: BalanceFetchRequest
  ): Promise<Result<BalanceFetchResult, DomainError>> {
    const startTime = Date.now();
    const results: BalanceAggregate[] = [];
    let fromCache = false;
    let cacheAge: number | undefined;

    try {
      const provider = this.providers.get(request.chain.toLowerCase());
      if (!provider) {
        return Result.failure(
          new ServiceError(
            'PROVIDER_NOT_FOUND',
            `No balance provider registered for chain: ${request.chain}`
          )
        );
      }

      // Check cache first if not forcing refresh
      if (!request.forceRefresh && this.cache) {
        const cacheKey = this.getCacheKey(request.address, request.chain, request.assetSymbol);
        const cached = await this.cache.get(cacheKey);
        
        if (cached && cached.age < this.defaultTTL) {
          // Create balance aggregate from cached data
          const aggregate = BalanceAggregate.create(
            `${request.accountId}-${cached.balance.getSymbol()}-${request.chain}`,
            request.accountId,
            cached.balance.getSymbol(),
            cached.balance.getSymbol(), // Use symbol as name fallback
            request.chain,
            cached.balance
          );
          
          aggregate.updateBalance(cached.balance, true, cached.age);
          results.push(aggregate);
          fromCache = true;
          cacheAge = cached.age;
          
          return Result.success({
            balances: results,
            fromCache,
            cacheAge,
            fetchDuration: Date.now() - startTime
          });
        }
      }

      // Fetch native balance
      const nativeResult = await provider.fetchBalance(
        request.address,
        request.chain,
        request.assetSymbol
      );

      if (nativeResult.isFailure) {
        return Result.failure(nativeResult.error);
      }

      const nativeBalance = nativeResult.value;
      
      // Create balance aggregate
      const nativeAggregate = BalanceAggregate.create(
        `${request.accountId}-${nativeBalance.getSymbol()}-${request.chain}`,
        request.accountId,
        nativeBalance.getSymbol(),
        nativeBalance.getSymbol(),
        request.chain,
        nativeBalance
      );
      
      nativeAggregate.updateBalance(nativeBalance, false);
      results.push(nativeAggregate);

      // Cache the result
      if (this.cache) {
        const cacheKey = this.getCacheKey(request.address, request.chain, nativeBalance.getSymbol());
        await this.cache.set(cacheKey, nativeBalance, this.defaultTTL);
      }

      // Fetch token balances if requested
      if (request.includeTokens) {
        const tokenResult = await provider.fetchTokenBalances(
          request.address,
          request.chain
        );

        if (tokenResult.isSuccess) {
          for (const tokenBalance of tokenResult.value) {
            const tokenAggregate = BalanceAggregate.create(
              `${request.accountId}-${tokenBalance.getSymbol()}-${request.chain}`,
              request.accountId,
              tokenBalance.getSymbol(),
              tokenBalance.getSymbol(),
              request.chain,
              tokenBalance,
              {
                contractAddress: tokenBalance.getContractAddress(),
                decimals: tokenBalance.getDecimals()
              }
            );
            
            tokenAggregate.updateBalance(tokenBalance, false);
            results.push(tokenAggregate);

            // Cache token balance
            if (this.cache) {
              const tokenCacheKey = this.getCacheKey(
                request.address,
                request.chain,
                tokenBalance.getSymbol()
              );
              await this.cache.set(tokenCacheKey, tokenBalance, this.defaultTTL);
            }
          }
        }
      }

      return Result.success({
        balances: results,
        fromCache: false,
        fetchDuration: Date.now() - startTime
      });

    } catch (error) {
      return Result.failure(
        new ServiceError(
          'BALANCE_FETCH_ERROR',
          error instanceof Error ? error.message : 'Unknown error fetching balances'
        )
      );
    }
  }

  /**
   * Fetch balances with retry logic
   */
  public async fetchBalancesWithRetry(
    request: BalanceFetchRequest,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Result<BalanceFetchResult, DomainError>> {
    let lastError: DomainError | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.fetchBalances(request);
      
      if (result.isSuccess) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry for certain errors
      if (lastError.code === 'PROVIDER_NOT_FOUND') {
        return result;
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
    
    return Result.failure(
      lastError || new ServiceError('RETRY_EXHAUSTED', 'All retry attempts failed')
    );
  }

  /**
   * Batch fetch balances for multiple accounts
   */
  public async batchFetchBalances(
    requests: BalanceFetchRequest[]
  ): Promise<Map<string, Result<BalanceFetchResult, DomainError>>> {
    const results = new Map<string, Result<BalanceFetchResult, DomainError>>();
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(requests, concurrencyLimit);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (request) => {
        const result = await this.fetchBalances(request);
        return { key: `${request.accountId}-${request.chain}`, result };
      });
      
      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(({ key, result }) => {
        results.set(key, result);
      });
    }
    
    return results;
  }

  /**
   * Invalidate cache for specific patterns
   */
  public async invalidateCache(pattern: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidate(pattern);
    }
  }

  /**
   * Warm up cache by pre-fetching balances
   */
  public async warmCache(requests: BalanceFetchRequest[]): Promise<void> {
    // Fetch all balances in background without waiting
    requests.forEach(request => {
      this.fetchBalances({ ...request, forceRefresh: true }).catch(error => {
        console.warn(`Cache warm-up failed for ${request.accountId}:`, error);
      });
    });
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(address: string, chain: string): Promise<{
    hasCache: boolean;
    age?: number;
    isStale?: boolean;
    isFresh?: boolean;
  }> {
    if (!this.cache) {
      return { hasCache: false };
    }

    const cacheKey = this.getCacheKey(address, chain);
    const age = await this.cache.getAge(cacheKey);
    
    if (age === null) {
      return { hasCache: false };
    }

    return {
      hasCache: true,
      age,
      isStale: age > 60000, // > 1 minute
      isFresh: age < 10000  // < 10 seconds
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(address: string, chain: string, assetSymbol?: string): string {
    const parts = ['balance', chain.toLowerCase(), address.toLowerCase()];
    if (assetSymbol) {
      parts.push(assetSymbol.toUpperCase());
    }
    return parts.join(':');
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Aggregate balances by asset across multiple accounts
   */
  public aggregateBalancesByAsset(
    balances: BalanceAggregate[]
  ): Map<string, BalanceAggregate> {
    const aggregated = new Map<string, BalanceAggregate>();
    
    for (const balance of balances) {
      const key = `${balance.getAssetSymbol()}-${balance.getChain()}`;
      const existing = aggregated.get(key);
      
      if (existing) {
        aggregated.set(key, existing.merge(balance));
      } else {
        aggregated.set(key, balance);
      }
    }
    
    return aggregated;
  }

  /**
   * Filter zero balances
   */
  public filterZeroBalances(balances: BalanceAggregate[]): BalanceAggregate[] {
    return balances.filter(balance => !balance.isZeroBalance());
  }

  /**
   * Sort balances by value (requires prices)
   */
  public sortByValue(balances: BalanceAggregate[]): BalanceAggregate[] {
    return [...balances].sort((a, b) => {
      const valueA = a.calculateValue() || 0;
      const valueB = b.calculateValue() || 0;
      return valueB - valueA; // Descending order
    });
  }
}