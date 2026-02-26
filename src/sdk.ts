import { RunAnywhere, SDKEnvironment, ModelCategory, LLMFramework, type CompactModelDef, EventBus } from '@runanywhere/web';
import { LlamaCPP } from '@runanywhere/web-llamacpp';
import { ONNX } from '@runanywhere/web-onnx';
import type { AccelerationMode } from '@runanywhere/web';

// IMPORTANT:
// Put your GGUF file here:
// public/models/gemma-2-2b-it-Q4_K_M.gguf

const MODELS: CompactModelDef[] = [
  {
    id: 'gemma-local',
    name: 'Gemma 2 2B Local',
    repo: 'local',
    files: ['/models/gemma-2-2b-it-Q4_K_M.gguf'], // lowercase models
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 2_000_000_000,
  },
];

let _init: Promise<void> | null = null;
let _accel: AccelerationMode | null = null;

export async function initSDK(): Promise<void> {
  if (_init) return _init;

  _init = (async () => {
    await RunAnywhere.initialize({
      environment: SDKEnvironment.Development,
      debug: true,
    });

    EventBus.shared.on('llamacpp.wasmLoaded', (evt: any) => {
      _accel = evt.accelerationMode ?? 'cpu';
      console.log('[SDK] Acceleration mode:', _accel);
    });

    await LlamaCPP.register();
    await ONNX.register();

    RunAnywhere.registerModels(MODELS);
    console.log('[SDK] ✓ Gemma local model registered');
  })();

  return _init;
}

export { RunAnywhere };