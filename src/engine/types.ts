export interface InferenceResult {
  text: string;
  done: boolean;
  error?: string;
}

export interface InferenceOptions {
  signal?: AbortSignal;
  onToken?: (token: string) => void;
  maxTokens?: number;
  temperature?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
}

export type TaskType =
  | 'text-generation'
  | 'summarization'
  | 'translation'
  | 'automatic-speech-recognition'
  | 'image-classification'
  | 'feature-extraction';

export interface ModelLoadProgress {
  modelId: string;
  file: string;
  progress: number;
  loaded: number;
  total: number;
  status: 'initiate' | 'download' | 'ready' | 'error';
}

export interface WorkerRequest {
  id: string;
  type: 'generate' | 'summarize' | 'translate' | 'transcribe' | 'classify-image' | 'embed' | 'load-model' | 'abort';
  modelId: string;
  input: string | ArrayBuffer | Float32Array;
  options?: InferenceOptions & { srcLang?: string; tgtLang?: string };
}

export interface WorkerResponse {
  id: string;
  type: 'token' | 'result' | 'error' | 'progress' | 'ready';
  data?: string | InferenceResult | EmbeddingResult | ModelLoadProgress | { label: string; score: number }[];
}
