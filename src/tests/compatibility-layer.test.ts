import { describe, it, expect, vi } from 'vitest';
import {
  useEvmBalanceRealTime,
  useEvmTransactionMonitor,
  ConnectionManager,
  type ConnectionStatus
} from '../types/evm-integration';

describe('EVM Integration Compatibility Layer', () => {
  it('should provide working useEvmBalanceRealTime hook', () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7095Ed6987' as `0x${string}`;
    
    // Test with enabled = true
    const result1 = useEvmBalanceRealTime(address, 1, { enabled: true });
    expect(result1.balance).toBeDefined();
    expect(result1.balance?.asset.symbol).toBe('ETH');
    expect(result1.isConnected).toBe(true);
    expect(result1.error).toBeNull();
    
    // Test with enabled = false
    const result2 = useEvmBalanceRealTime(address, 1, { enabled: false });
    expect(result2.balance).toBeNull();
  });
  
  it('should provide working useEvmTransactionMonitor hook', () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7095Ed6987' as `0x${string}`;
    
    const result = useEvmTransactionMonitor(address, 1, { enabled: true });
    expect(result.transactions).toBeDefined();
    expect(Array.isArray(result.transactions)).toBe(true);
  });
  
  it('should provide working ConnectionManager', async () => {
    const manager = new ConnectionManager();
    expect(manager).toBeDefined();
    expect(manager.onStatusChange).toBeDefined();
    expect(manager.connect).toBeDefined();
    expect(manager.disconnect).toBeDefined();
    
    // Test onStatusChange
    const statusCallback = vi.fn();
    const unsubscribe = manager.onStatusChange(statusCallback);
    
    // Wait for the simulated connection
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(statusCallback).toHaveBeenCalled();
    const status: ConnectionStatus = statusCallback.mock.calls[0][0];
    expect(status.chainId).toBe(1);
    expect(status.isConnected).toBe(true);
    expect(status.lastConnected).toBeDefined();
    
    // Test unsubscribe
    unsubscribe();
  });
});