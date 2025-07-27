import { describe, it, expect } from 'vitest';

// Test that all expected exports from @cygnus-wealth/evm-integration are available
describe('EVM Integration Library Exports', () => {
  it('should export all required hooks', async () => {
    const evmIntegration = await import('@cygnus-wealth/evm-integration');
    
    // Hooks
    expect(evmIntegration.useEvmBalance).toBeDefined();
    expect(evmIntegration.useEvmBalanceRealTime).toBeDefined();
    expect(evmIntegration.useEvmTransactionMonitor).toBeDefined();
    expect(evmIntegration.useEvmTransactions).toBeDefined();
    expect(evmIntegration.useEvmConnect).toBeDefined();
    
    // Services
    expect(evmIntegration.ConnectionManager).toBeDefined();
    expect(evmIntegration.WebSocketProvider).toBeDefined();
    
    // Utils
    expect(evmIntegration.mapChainIdToChain).toBeDefined();
    expect(evmIntegration.mapChainToChainId).toBeDefined();
    expect(evmIntegration.mapEvmBalanceToBalance).toBeDefined();
    expect(evmIntegration.mapTokenToAsset).toBeDefined();
    expect(evmIntegration.mapEvmTransaction).toBeDefined();
  });
  
  it('should export required types from data-models', async () => {
    const dataModels = await import('@cygnus-wealth/data-models');
    
    // Core types
    expect(dataModels.Balance).toBeDefined();
    expect(dataModels.Transaction).toBeDefined();
    expect(dataModels.Asset).toBeDefined();
    expect(dataModels.Price).toBeDefined();
    
    // Enums
    expect(dataModels.AssetType).toBeDefined();
    expect(dataModels.Chain).toBeDefined();
    expect(dataModels.TransactionType).toBeDefined();
  });
  
  it('ConnectionManager should be constructable', async () => {
    const { ConnectionManager } = await import('@cygnus-wealth/evm-integration');
    
    const manager = new ConnectionManager();
    expect(manager).toBeDefined();
    expect(manager.onStatusChange).toBeDefined();
    expect(manager.connect).toBeDefined();
    expect(manager.disconnect).toBeDefined();
  });
});