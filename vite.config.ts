import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@cygnus-wealth/evm-integration',
      '@cygnus-wealth/data-models'
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});