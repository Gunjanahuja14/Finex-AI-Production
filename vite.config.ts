import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    // This is the "Magic Fix": It tells Vite to serve anything 
    // from these folders as if they were in your root.
    fs: {
      allow: [
        __dir,
        path.resolve(__dir, 'node_modules/@runanywhere/web-llamacpp/wasm'),
        path.resolve(__dir, 'node_modules/@runanywhere/web-onnx/wasm')
      ],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // Keep these excluded so Vite doesn't try to "bundle" the binaries
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },
  build: {
    target: 'esnext',
  }
});