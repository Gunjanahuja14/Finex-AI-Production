import { RunAnywhere, SDKEnvironment, ModelCategory, LLMFramework, type CompactModelDef, EventBus } from '@runanywhere/web';
import { LlamaCPP } from '@runanywhere/web-llamacpp';
import { ONNX } from '@runanywhere/web-onnx';
import type { AccelerationMode } from '@runanywhere/web';

// Using the 350M model is MUCH safer for browser stability
export const LLM_MODEL_ID = 'lfm2-350m-q4_k_m';

const MODELS: CompactModelDef[] = [
  {
    id: LLM_MODEL_ID,
    name: 'LFM2 350M',
    repo: 'LiquidAI/LFM2-350M-GGUF',
    files: ['LFM2-350M-Q4_K_M.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 250_000_000,
  },
];

let _init: Promise<void> | null = null;
let _accel: AccelerationMode | null = null;

export async function initSDK(): Promise<void> {
  if (_init) return _init;
  
  _init = (async () => {
    try {
      console.log('[SDK] Initializing with WebGPU priority...');
      
      await RunAnywhere.initialize({ 
        environment: SDKEnvironment.Development, 
        debug: true, // Turned on debug to help see GPU logs
        wasmPath: '/', // IMPORTANT: This looks in your /public folder for the .js/.wasm files
      });

      EventBus.shared.on('llamacpp.wasmLoaded', (evt: any) => { 
        _accel = evt.accelerationMode ?? 'cpu';
        console.log('[SDK] Final Acceleration mode:', _accel);
      });

      await LlamaCPP.register();
      console.log('[SDK] ✓ LLM backend registered');

      await ONNX.register();
      console.log('[SDK] ✓ Voice backend registered');

      RunAnywhere.registerModels(MODELS);
      console.log('[SDK] ✓ Models registered');
    } catch (error) {
      console.error('[SDK] Initialization error:', error);
      throw error;
    }
  })();

  return _init;
}

export function getAccelerationMode(): AccelerationMode | null { 
  return _accel; 
}

export { RunAnywhere };