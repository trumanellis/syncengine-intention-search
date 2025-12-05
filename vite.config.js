import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    sveltekit(),
    nodePolyfills({
      include: ['buffer', 'stream', 'crypto', 'util', 'events', 'path', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  optimizeDeps: {
    include: ['@xenova/transformers'], // Changed from exclude to include
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: []
    }
  },
  // Support for WASM files
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
  worker: {
    format: 'es',
    plugins: () => [
      nodePolyfills({
        include: ['buffer', 'stream', 'crypto', 'util', 'events'],
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      })
    ]
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  // CORS headers for SharedArrayBuffer support (needed by ONNX Runtime)
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
