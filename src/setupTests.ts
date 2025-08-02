import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.ethereum for wallet tests
global.window = {
  ...global.window,
  ethereum: {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  }
} as any;