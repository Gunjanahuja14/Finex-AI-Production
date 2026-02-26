/**
 * llama-wasm.ts — FINEX-AI
 * Using Gemma 2B Q4 — better quality than Qwen 1.5B, faster than Phi-3.
 */

import { Wllama } from '@wllama/wllama';
import wasm_from_cdn from '@wllama/wllama/src/wasm-from-cdn';

export type DownloadProgress = {
  loaded: number;
  total: number;
  percent: number;
  stage: 'downloading' | 'initializing' | 'ready' | 'error';
};

export type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  onToken?: (token: string) => void;
};

// Gemma 2B Instruct Q4_K_M — ~1.5GB, much better instruction following than 1.5B models
const MODEL_HF_REPO = 'bartowski/gemma-2-2b-it-GGUF';
const MODEL_HF_FILE = 'gemma-2-2b-it-Q4_K_M.gguf';

class LlamaWasmService {
  private wllama: Wllama | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async downloadAndInit(onProgress?: (p: DownloadProgress) => void): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        onProgress?.({ loaded: 0, total: 0, percent: 0, stage: 'downloading' });
        this.wllama = new Wllama(wasm_from_cdn);

        await this.wllama.loadModelFromHF(MODEL_HF_REPO, MODEL_HF_FILE, {
          progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            onProgress?.({ loaded, total, percent, stage: 'downloading' });
          },
        });

        onProgress?.({ loaded: 1, total: 1, percent: 100, stage: 'initializing' });
        this.isInitialized = true;
        onProgress?.({ loaded: 1, total: 1, percent: 100, stage: 'ready' });
      } catch (err) {
        this.initPromise = null;
        onProgress?.({ loaded: 0, total: 0, percent: 0, stage: 'error' });
        throw err;
      }
    })();

    return this.initPromise;
  }

  get ready(): boolean {
    return this.isInitialized && this.wllama !== null;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    if (!this.wllama) throw new Error('Model not initialized.');

    const { maxTokens = 150, temperature = 0.2, topP = 0.9, onToken } = options;

    let previousText = '';

    const fullResult = await this.wllama.createCompletion(prompt, {
      nPredict: maxTokens,
      sampling: {
        temp: temperature,
        top_p: topP,
        penalty_repeat: 1.3,
        penalty_last_n: 64,
      },
      onNewToken: (_token: number, _piece: Uint8Array, currentText: string) => {
        if (onToken) {
          const newPart = currentText.slice(previousText.length);
          if (newPart) onToken(newPart);
          previousText = currentText;
        }
      },
    });

    // Strip Gemma chat template tokens from output
    return fullResult
      .replace(/<end_of_turn>.*/s, '')
      .replace(/<start_of_turn>.*/s, '')
      .trim();
  }
}

export const llamaService = new LlamaWasmService();