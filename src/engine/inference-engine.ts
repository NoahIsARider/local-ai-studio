import { detectChromeAI, chromeAIGenerate, chromeAISummarize, chromeAITranslate } from './chrome-ai';
import {
  loadTransformersPipeline,
  runTextGeneration,
  runSummarization,
  runTranslation,
  runTranscription,
  runImageClassification,
  runEmbedding,
  isModelLoaded,
} from './transformers-engine';
import type { ChromeAICapabilities } from './chrome-ai';
import type { ModelLoadProgress } from './types';

export class InferenceEngine {
  private chromeAI: ChromeAICapabilities = {
    available: false,
    promptAPI: false,
    summarizerAPI: false,
    translatorAPI: false,
    writerAPI: false,
    rewriterAPI: false,
  };

  async initialize(): Promise<void> {
    this.chromeAI = await detectChromeAI();
  }

  getChromeAICapabilities(): ChromeAICapabilities {
    return this.chromeAI;
  }

  async loadModel(
    modelId: string,
    task: string,
    onProgress?: (p: ModelLoadProgress) => void
  ): Promise<void> {
    await loadTransformersPipeline(modelId, task, onProgress);
  }

  async *generate(
    prompt: string,
    options: { modelId?: string; systemPrompt?: string; temperature?: number; signal?: AbortSignal } = {}
  ): AsyncGenerator<string> {
    if (this.chromeAI.promptAPI) {
      const gen = await chromeAIGenerate(prompt, { systemPrompt: options.systemPrompt, temperature: options.temperature });
      yield* gen;
      return;
    }

    const modelId = options.modelId || 'llm-small';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    const gen = await runTextGeneration(modelId, prompt, {
      temperature: options.temperature,
      signal: options.signal,
    });
    yield* gen;
  }

  async summarize(
    text: string,
    options: { modelId?: string } = {}
  ): Promise<string> {
    if (this.chromeAI.summarizerAPI) {
      return chromeAISummarize(text);
    }

    const modelId = options.modelId || 'summarizer';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    return runSummarization(modelId, text);
  }

  async translate(
    text: string,
    srcLang: string,
    tgtLang: string,
    options: { modelId?: string } = {}
  ): Promise<string> {
    if (this.chromeAI.translatorAPI) {
      return chromeAITranslate(text, srcLang, tgtLang);
    }

    const modelId = options.modelId || 'translator';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    return runTranslation(modelId, text, srcLang, tgtLang);
  }

  async transcribe(
    audio: Float32Array,
    options: { modelId?: string } = {}
  ): Promise<string> {
    const modelId = options.modelId || 'whisper-tiny';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    return runTranscription(modelId, audio);
  }

  async classifyImage(
    image: HTMLImageElement | HTMLCanvasElement,
    options: { modelId?: string } = {}
  ): Promise<Array<{ label: string; score: number }>> {
    const modelId = options.modelId || 'vit-base';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    return runImageClassification(modelId, image);
  }

  async embed(
    texts: string[],
    options: { modelId?: string } = {}
  ): Promise<number[][]> {
    const modelId = options.modelId || 'embedding';
    if (!isModelLoaded(modelId)) {
      throw new Error(`Model ${modelId} not loaded. Please download and load it first.`);
    }
    return runEmbedding(modelId, texts);
  }

  isModelLoaded(modelId: string): boolean {
    return isModelLoaded(modelId);
  }
}

export const inferenceEngine = new InferenceEngine();
