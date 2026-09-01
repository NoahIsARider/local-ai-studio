import { useState, useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch, type ModelInfo } from '../store';
import { inferenceEngine } from '../engine/inference-engine';
import type { ModelLoadProgress } from '../engine/types';

const statusLabels: Record<string, string> = {
  'not-downloaded': 'Not Downloaded',
  'downloading': 'Downloading',
  'downloaded': 'Downloaded',
  'loading': 'Loading',
  'ready': 'Ready',
  'error': 'Error',
};

const statusColors: Record<string, string> = {
  'not-downloaded': 'bg-[#86868B]/15 text-[#86868B]',
  'downloading': 'bg-[#007AFF]/15 text-[#007AFF]',
  'downloaded': 'bg-[#34C759]/15 text-[#34C759]',
  'loading': 'bg-[#FF9500]/15 text-[#FF9500]',
  'ready': 'bg-[#34C759]/15 text-[#34C759]',
  'error': 'bg-[#FF3B30]/15 text-[#FF3B30]',
};

export default function ModelManager() {
  const { models, chromeAIAvailable, chromeAIModels } = useAppState();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<string>('all');
  const [mirrorSource, setMirrorSource] = useState<'default' | 'hf-mirror'>('default');

  useEffect(() => {
    inferenceEngine.initialize().then(() => {
      const caps = inferenceEngine.getChromeAICapabilities();
      dispatch({
        type: 'SET_CHROME_AI',
        payload: {
          available: caps.available,
          models: {
            'prompt': caps.promptAPI,
            'summarizer': caps.summarizerAPI,
            'translator': caps.translatorAPI,
          },
        },
      });
    });
  }, [dispatch]);

  const filteredModels = filter === 'all'
    ? models
    : models.filter(m => m.task === filter);

  const handleDownload = useCallback(async (model: ModelInfo) => {
    dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, status: 'downloading', progress: 0 } });

    try {
      const onProgress = (p: ModelLoadProgress) => {
        const progress = p.status === 'download' ? Math.round(p.progress * 100) : 0;
        dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, progress, status: 'downloading' } });
      };

      await inferenceEngine.loadModel(model.name.toLowerCase().includes('phi') ? 'Xenova/Phi-3.5-mini-instruct-onnx' : model.id, model.task, onProgress);

      dispatch({
        type: 'UPDATE_MODEL',
        payload: { id: model.id, status: 'ready', progress: 100, lastUsed: Date.now() },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, status: 'error', progress: 0 } });
      console.error(`Model download error: ${errorMsg}`);
    }
  }, [dispatch]);

  const handleLoad = useCallback(async (model: ModelInfo) => {
    dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, status: 'loading' } });

    try {
      await inferenceEngine.loadModel(model.id, model.task);
      dispatch({
        type: 'UPDATE_MODEL',
        payload: { id: model.id, status: 'ready', lastUsed: Date.now() },
      });
    } catch (err) {
      dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, status: 'error' } });
    }
  }, [dispatch]);

  const handleClear = useCallback((model: ModelInfo) => {
    dispatch({ type: 'UPDATE_MODEL', payload: { id: model.id, status: 'not-downloaded', progress: 0 } });
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => {
          if (key.includes(model.id)) {
            caches.delete(key);
          }
        });
      });
    }
  }, [dispatch]);

  const taskFilters = [
    { key: 'all', label: 'All' },
    { key: 'text-generation', label: 'LLM' },
    { key: 'summarization', label: 'Summarize' },
    { key: 'translation', label: 'Translate' },
    { key: 'automatic-speech-recognition', label: 'ASR' },
    { key: 'image-classification', label: 'Vision' },
    { key: 'feature-extraction', label: 'Embedding' },
  ];

  const totalSize = models.reduce((sum, m) => sum + (m.status !== 'not-downloaded' ? m.sizeBytes : 0), 0);
  const readyModels = models.filter(m => m.status === 'ready').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-[#86868B] dark:text-[#98989D] mb-1">Models Ready</p>
          <p className="text-2xl font-semibold text-[#1D1D1F] dark:text-white">{readyModels}<span className="text-sm font-normal text-[#86868B]">/{models.length}</span></p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[#86868B] dark:text-[#98989D] mb-1">Cache Used</p>
          <p className="text-2xl font-semibold text-[#1D1D1F] dark:text-white">{(totalSize / 1e9).toFixed(1)}<span className="text-sm font-normal text-[#86868B]"> GB</span></p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[#86868B] dark:text-[#98989D] mb-1">Chrome AI</p>
          <p className={`text-2xl font-semibold ${chromeAIAvailable ? 'text-[#34C759]' : 'text-[#86868B]'}`}>
            {chromeAIAvailable ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Chrome AI Status */}
      {chromeAIAvailable && (
        <div className="card p-4 border border-[#34C759]/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#34C759]" />
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">Chrome Built-in AI Detected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(chromeAIModels).map(([name, available]) => (
              <span
                key={name}
                className={`px-2 py-1 text-[10px] font-medium rounded-lg ${
                  available ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#86868B]/15 text-[#86868B]'
                }`}
              >
                {name} {available ? '✓' : '✗'}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[#86868B] dark:text-[#98989D] mt-2">
            Chrome AI models will be used automatically when available, with fallback to local models.
          </p>
        </div>
      )}

      {/* Settings */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-white">Model Mirror Source</p>
            <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-0.5">
              {mirrorSource === 'default' ? 'HuggingFace CDN' : 'HF Mirror (China)'}
            </p>
          </div>
          <div className="flex gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/10">
            <button
              onClick={() => setMirrorSource('default')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg btn-press ease-transition ${
                mirrorSource === 'default'
                  ? 'bg-white dark:bg-white/20 text-[#1D1D1F] dark:text-white shadow-sm'
                  : 'text-[#86868B]'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setMirrorSource('hf-mirror')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg btn-press ease-transition ${
                mirrorSource === 'hf-mirror'
                  ? 'bg-white dark:bg-white/20 text-[#1D1D1F] dark:text-white shadow-sm'
                  : 'text-[#86868B]'
              }`}
            >
              HF Mirror
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {taskFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap btn-press ease-transition ${
              filter === f.key
                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                : 'bg-black/5 dark:bg-white/5 text-[#86868B] dark:text-[#98989D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Model List */}
      <div className="space-y-3">
        {filteredModels.map(model => (
          <div key={model.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-[#1D1D1F] dark:text-white">{model.name}</h4>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[model.status]}`}>
                    {statusLabels[model.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#86868B] dark:text-[#98989D]">
                  <span>{model.task}</span>
                  <span>·</span>
                  <span>{model.size}</span>
                  <span>·</span>
                  <span>{model.backend === 'chrome-ai' ? 'Chrome AI' : 'Transformers.js'}</span>
                </div>

                {/* Progress Bar */}
                {model.status === 'downloading' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#007AFF]">Downloading...</span>
                      <span className="text-[10px] text-[#86868B]">{model.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#007AFF] ease-transition progress-pulse"
                        style={{ width: `${model.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                {model.status === 'not-downloaded' && (
                  <button
                    onClick={() => handleDownload(model)}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-[#007AFF] text-white btn-press ease-transition"
                  >
                    Download
                  </button>
                )}
                {model.status === 'downloaded' && (
                  <button
                    onClick={() => handleLoad(model)}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-[#34C759] text-white btn-press ease-transition"
                  >
                    Load
                  </button>
                )}
                {(model.status === 'downloading' || model.status === 'loading') && (
                  <div className="px-4 py-2 text-xs font-medium rounded-xl bg-black/5 dark:bg-white/10 text-[#86868B]">
                    Processing...
                  </div>
                )}
                {model.status === 'ready' && (
                  <span className="px-4 py-2 text-xs font-medium rounded-xl bg-[#34C759]/10 text-[#34C759]">
                    Active
                  </span>
                )}
                {model.status !== 'not-downloaded' && model.status !== 'downloading' && (
                  <button
                    onClick={() => handleClear(model)}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] btn-press ease-transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
