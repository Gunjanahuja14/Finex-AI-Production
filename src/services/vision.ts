/**
 * vision.ts — FINEX-AI Vision Services
 * 
 * Features:
 * - VLM (Vision Language Model): LFM2-VL 450M (or LLaVA via ONNX)
 * 
 * Used for analyzing images (receipts, bills, etc.)
 */

import { ONNX } from '@runanywhere/web-onnx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VisionServiceState = {
  isProcessing: boolean;
  isReady: boolean;
  error: string | null;
};

export type ImageAnalysisResult = {
  description: string;
  extractedText?: string;
  confidence: number;
  entities?: {
    amount?: number;
    date?: string;
    vendor?: string;
    category?: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ONNX-BASED VLM SERVICE (LLaVA / LFM2-VL)
// ─────────────────────────────────────────────────────────────────────────────

class ONNXVLMService {
  private isLoaded = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Vision] Initializing ONNX VLM...');
        
        // Try to load vision model via ONNX
        // Note: The actual model loading depends on ONNX runtime availability
        if (ONNX && (ONNX as any).vision) {
          await (ONNX as any).vision.initialize({
            model: 'llava-1.5-q4', // LLaVA 1.5 with Q4 quantization
          });
          console.log('[Vision] ONNX VLM initialized');
        } else {
          console.warn('[Vision] ONNX VLM not available');
          throw new Error('ONNX VLM not available');
        }
        
        this.isLoaded = true;
      } catch (err) {
        console.error('[Vision] Failed to init ONNX VLM:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  async analyzeImage(imageData: ImageData | Blob): Promise<ImageAnalysisResult> {
    if (!this.isLoaded) {
      throw new Error('VLM not initialized');
    }

    try {
      if (ONNX && (ONNX as any).vision) {
        const result = await (ONNX as any).vision.analyze(imageData, {
          prompt: 'Analyze this image. Extract any text, amounts, dates, vendor names, and categorize the content.',
        });
        
        return {
          description: result.description || '',
          extractedText: result.text,
          confidence: result.confidence || 0.9,
          entities: {
            amount: result.amount,
            date: result.date,
            vendor: result.vendor,
            category: result.category,
          },
        };
      }
      
      throw new Error('Vision analysis failed');
    } catch (err) {
      console.error('[Vision] Image analysis error:', err);
      throw err;
    }
  }

  async describeImage(imageData: ImageData | Blob, prompt?: string): Promise<string> {
    if (!this.isLoaded) {
      throw new Error('VLM not initialized');
    }

    try {
      if (ONNX && (ONNX as any).vision) {
        const result = await (ONNX as any).vision.describe(imageData, {
          prompt: prompt || 'Describe what you see in this image in detail.',
        });
        return result.description;
      }
      
      throw new Error('Vision description failed');
    } catch (err) {
      console.error('[Vision] Image description error:', err);
      throw err;
    }
  }

  get ready(): boolean {
    return this.isLoaded;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER-BASED FALLBACK (using Canvas and basic OCR-like features)
// ─────────────────────────────────────────────────────────────────────────────

class BrowserVisionFallback {
  private _ready = false;

  async init(): Promise<void> {
    // Just mark as ready - we'll do basic image analysis
    this._ready = true;
    console.log('[Vision] Browser vision fallback initialized');
  }

  get ready(): boolean {
    return this._ready;
  }

  async analyzeImage(imageData: ImageData | Blob): Promise<ImageAnalysisResult> {
    // Basic image analysis - just return a placeholder
    // In a real implementation, this could use Tesseract.js for OCR
    return {
      description: 'Image analysis not available in fallback mode. Please use a browser with ONNX support.',
      confidence: 0,
    };
  }

  async describeImage(imageData: ImageData | Blob, prompt?: string): Promise<string> {
    return 'Image description not available in fallback mode.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VISION SERVICE (with fallback)
// ─────────────────────────────────────────────────────────────────────────────

class VisionService {
  private vlm: ONNXVLMService | BrowserVisionFallback | null = null;
  private state: VisionServiceState;
  private useONNX = true;
  private isInitialized = false;

  constructor() {
    this.state = {
      isProcessing: false,
      isReady: false,
      error: null,
    };
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('[Vision] Attempting to initialize ONNX vision services...');
      
      try {
        this.vlm = new ONNXVLMService();
        await (this.vlm as ONNXVLMService).init();
        this.useONNX = true;
        console.log('[Vision] ✓ ONNX vision services initialized successfully');
      } catch (onnxErr) {
        console.warn('[Vision] ONNX not available, using browser fallback:', onnxErr);
        this.useONNX = false;
        
        this.vlm = new BrowserVisionFallback();
        await (this.vlm as BrowserVisionFallback).init();
        
        console.log('[Vision] ✓ Browser vision fallback initialized');
      }
      
      this.isInitialized = true;
      this.state.isReady = true;
      console.log('[Vision] All vision services ready');
    } catch (err) {
      console.error('[Vision] Failed to initialize vision services:', err);
      this.state.error = err instanceof Error ? err.message : 'Vision init failed';
      throw err;
    }
  }

  get ready(): boolean {
    return this.isInitialized && (this.vlm?.ready ?? false);
  }

  get isProcessing(): boolean {
    return this.state.isProcessing;
  }

  async analyzeReceipt(file: File): Promise<ImageAnalysisResult> {
    if (!this.ready) {
      throw new Error('Vision service not ready');
    }

    this.state.isProcessing = true;

    try {
      // Convert file to ImageData
      const imageData = await this.fileToImageData(file);
      
      if (this.useONNX && this.vlm && 'analyzeImage' in this.vlm) {
        return await (this.vlm as ONNXVLMService).analyzeImage(imageData);
      } else if (this.vlm && 'analyzeImage' in this.vlm) {
        return await (this.vlm as BrowserVisionFallback).analyzeImage(imageData);
      }
      
      throw new Error('Vision analysis not available');
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Analysis failed';
      throw err;
    } finally {
      this.state.isProcessing = false;
    }
  }

  async describeImage(file: File, prompt?: string): Promise<string> {
    if (!this.ready) {
      throw new Error('Vision service not ready');
    }

    this.state.isProcessing = true;

    try {
      const imageData = await this.fileToImageData(file);
      
      if (this.useONNX && this.vlm && 'describeImage' in this.vlm) {
        return await (this.vlm as ONNXVLMService).describeImage(imageData, prompt);
      } else if (this.vlm && 'describeImage' in this.vlm) {
        return await (this.vlm as BrowserVisionFallback).describeImage(imageData, prompt);
      }
      
      throw new Error('Vision description not available');
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Description failed';
      throw err;
    } finally {
      this.state.isProcessing = false;
    }
  }

  private fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  getState(): VisionServiceState {
    return { ...this.state };
  }
}

// Export singleton instance
export const visionService = new VisionService();
