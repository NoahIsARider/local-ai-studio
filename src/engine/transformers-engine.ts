import type { ModelLoadProgress } from './types';

type ProgressCallback = (progress: ModelLoadProgress) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineInstance: Record<string, any> = {};
let envConfigured = false;

function configureEnv() {
  if (envConfigured) return;
  envConfigured = true;
}

export async function loadTransformersPipeline(
  modelId: string,
  task: string,
  onProgress?: ProgressCallback
): Promise<unknown> {
  configureEnv();

  if (pipelineInstance[modelId]) {
    return pipelineInstance[modelId];
  }

  const { pipeline, env } = await import('@huggingface/transformers');

  // Configure environment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const envAny = env as any;
  envAny.allowLocal = false;
  envAny.useBrowserCache = true;

  const hfMirror = 'https://hf-mirror.com';
  // .cn 域名自动切到 hf-mirror（国内访问 HuggingFace 更稳）
  const useMirror = typeof window !== 'undefined' && window.location.hostname.includes('cn');

  if (useMirror) {
    envAny.remoteHost = hfMirror;
    envAny.remotePathTemplate = '{model}/resolve/main/';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progressHandler = (p: any) => {
    if (onProgress && p.status) {
      onProgress({
        modelId,
        file: p.file || '',
        progress: p.progress || 0,
        loaded: p.loaded || 0,
        total: p.total || 0,
        status: p.status || 'download',
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipe = await pipeline(task as any, modelId, {
    device: 'webgpu',
    dtype: 'q4',
    progress_callback: progressHandler,
  });

  pipelineInstance[modelId] = pipe;
  return pipe;
}

export async function runTextGeneration(
  modelId: string,
  prompt: string,
  options: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}
): Promise<AsyncGenerator<string>> {
  const { maxTokens = 512, temperature = 0.7 } = options;

  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  async function* generate(): AsyncGenerator<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await pipe(prompt, {
      max_new_tokens: maxTokens,
      temperature,
      do_sample: temperature > 0,
      num_return_sequences: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = output as any[];
    const text = result?.[0]?.generated_text || result?.[0]?.output_text || '';

    const words = text.split(/(?<=\s)/);
    for (const word of words) {
      if (options.signal?.aborted) break;
      yield word;
      await new Promise(r => setTimeout(r, 20));
    }
  }

  return generate();
}

export async function runSummarization(
  modelId: string,
  text: string
): Promise<string> {
  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pipe(text, {
    max_length: 150,
    min_length: 30,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = result as any[];
  return output?.[0]?.summary_text || '';
}

export async function runTranslation(
  modelId: string,
  text: string,
  srcLang: string,
  tgtLang: string
): Promise<string> {
  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  const forcedBosTokenId = tgtLang === 'zh' ? 2 : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pipe(text, {
    src_lang: srcLang,
    tgt_lang: tgtLang,
    forced_bos_token_id: forcedBosTokenId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = result as any[];
  return output?.[0]?.translation_text || '';
}

export async function runTranscription(
  modelId: string,
  audio: Float32Array
): Promise<string> {
  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pipe(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = result as any;
  return output?.text || '';
}

export async function runImageClassification(
  modelId: string,
  image: HTMLImageElement | HTMLCanvasElement
): Promise<Array<{ label: string; score: number }>> {
  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pipe(image, { topk: 5 });
  return result as Array<{ label: string; score: number }>;
}

export async function runEmbedding(
  modelId: string,
  texts: string[]
): Promise<number[][]> {
  const pipe = pipelineInstance[modelId];
  if (!pipe) {
    throw new Error(`Model ${modelId} not loaded`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pipe(texts, { pooling: 'mean', normalize: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = result as any;

  if (output?.data && output?.dims) {
    const [batchSize, dim] = output.dims;
    const embeddings: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      embeddings.push(Array.from(output.data.slice(i * dim, (i + 1) * dim)));
    }
    return embeddings;
  }

  return [];
}

export function isModelLoaded(modelId: string): boolean {
  return !!pipelineInstance[modelId];
}

export function getLoadedModels(): string[] {
  return Object.keys(pipelineInstance);
}

export function unloadModel(modelId: string): void {
  delete pipelineInstance[modelId];
}
