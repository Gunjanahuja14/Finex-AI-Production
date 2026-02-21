import { 
  RunAnywhere, 
  SDKEnvironment, 
  ModelCategory, 
  LLMFramework, 
  type CompactModelDef, 
  EventBus 
} from '@runanywhere/web';
import { LlamaCPP, TextGeneration } from '@runanywhere/web-llamacpp';
import { ONNX } from '@runanywhere/web-onnx';
import { db } from './db';
import type { Transaction } from '../models/Transaction';

// 1. CONFIGURATION
export const LLM_MODEL_ID = 'lfm2-350m-q4_k_m'; // Safer for browser RAM

const MODELS: CompactModelDef[] = [{
  id: LLM_MODEL_ID,
  name: 'LFM2 350M',
  repo: 'LiquidAI/LFM2-350M-GGUF',
  files: ['LFM2-350M-Q4_K_M.gguf'],
  framework: LLMFramework.LlamaCpp,
  modality: ModelCategory.Language,
  memoryRequirement: 250_000_000,
}];

// 2. HELPERS
const SMALL_TALK_PATTERNS = [/^hi\s*$/i, /^hello\s*$/i, /^hey\s*$/i];
const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// 3. THE MAIN SERVICE
export const aiService = {
  async initSDK() {
    try {
      console.log('[SDK] Initializing WebGPU...');
      await RunAnywhere.initialize({ 
        environment: SDKEnvironment.Development,
        wasmPath: '/', // Looks in your /public folder
      });

      await LlamaCPP.register();
      await ONNX.register();
      RunAnywhere.registerModels(MODELS);
      
      console.log('[SDK] Ready');
    } catch (error) {
      console.error('[SDK] Error:', error);
    }
  },

  async initializeCustomModel(onProgress?: (progress: number) => void) {
    try {
      const unsub = RunAnywhere.events.on('model.downloadProgress', (event) => {
        if (event.modelId === LLM_MODEL_ID && onProgress) onProgress(event.progress);
      });

      await RunAnywhere.downloadModel(LLM_MODEL_ID);
      unsub();
      await RunAnywhere.loadModel(LLM_MODEL_ID);
      console.log("🚀 Model Loaded on GPU");
    } catch (err) {
      console.error("Load failed:", err);
    }
  },

  isModelLoaded(): boolean {
    return RunAnywhere.getLoadedModel(ModelCategory.Language) !== null;
  },

  async getAdvice(question: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.isModelLoaded()) return "Wait for model to load...";
    
    try {
      const snapshot = await db.getAISnapshot();
      const systemPrompt = `Financial assistant. Max 2 sentences. Use ₹.`;
      const userPrompt = `Total Spend: ₹${snapshot.last30Days.total}. Question: ${question}`;

      const streamResult = await TextGeneration.generateStream(userPrompt, {
        maxTokens: 100,
        temperature: 0.2,
        systemPrompt,
      });

      let response = '';
      for await (const token of streamResult.stream) {
        response += token;
        onToken?.(token);
      }
      return response;
    } catch (err) {
      return "⚠️ Error generating advice.";
    }
  }
};