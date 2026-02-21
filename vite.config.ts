import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Copies WASM binaries from the backend npm packages into dist/assets/
 * so they're served alongside the bundled JS at runtime.
 */
function copyWasmPlugin(): Plugin {
  const llamacppWasm = path.resolve(__dir, 'node_modules/@runanywhere/web-llamacpp/wasm');
  const onnxWasm = path.resolve(__dir, 'node_modules/@runanywhere/web-onnx/wasm');

  return {
    name: 'copy-wasm',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dir, 'dist');
      const assetsDir = path.join(outDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      // LlamaCpp WASM binaries
      const llamacppFiles = [
        { src: path.join(llamacppWasm, 'racommons-llamacpp.wasm'), dest: 'racommons-llamacpp.wasm' },
        { src: path.join(llamacppWasm, 'racommons-llamacpp-webgpu.wasm'), dest: 'racommons-llamacpp-webgpu.wasm' },
        { src: path.join(llamacppWasm, 'racommons-llamacpp.js'), dest: 'racommons-llamacpp.js' },
        { src: path.join(llamacppWasm, 'racommons-llamacpp-webgpu.js'), dest: 'racommons-llamacpp-webgpu.js' },
      ];

      for (const { src, dest } of llamacppFiles) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(assetsDir, dest));
          const sizeMB = (fs.statSync(src).size / 1_000_000).toFixed(1);
          console.log(`✓ Copied ${dest} (${sizeMB} MB)`);
        } else {
          console.warn(`⚠ Missing: ${src}`);
        }
      }

      // Sherpa ONNX
      const sherpaDir = path.join(onnxWasm, 'sherpa');
      const sherpaOut = path.join(assetsDir, 'sherpa');

      if (fs.existsSync(sherpaDir)) {
        fs.mkdirSync(sherpaOut, { recursive: true });
        for (const file of fs.readdirSync(sherpaDir)) {
          const src = path.join(sherpaDir, file);
          fs.copyFileSync(src, path.join(sherpaOut, file));
          const sizeMB = (fs.statSync(src).size / 1_000_000).toFixed(1);
          console.log(`✓ Copied sherpa/${file} (${sizeMB} MB)`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyWasmPlugin()],

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
  },

  assetsInclude: ['**/*.wasm'],

  worker: {
    format: 'es',
  },

  build: {
    target: 'esnext',
  }
});
