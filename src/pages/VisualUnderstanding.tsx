import { useState, useRef, useCallback } from 'react';
import { inferenceEngine } from '../engine/inference-engine';

interface ClassificationResult {
  label: string;
  score: number;
}

export default function VisualUnderstanding() {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [activeTab, setActiveTab] = useState<'classify' | 'ocr'>('classify');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
      setResults([]);
      setOcrText('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClassify = useCallback(async () => {
    if (!image || loading) return;
    setLoading(true);

    try {
      const img = imgRef.current;
      if (!img) throw new Error('Image not loaded');

      const canvas = canvasRef.current!;
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 224, 224);

      const classifications = await inferenceEngine.classifyImage(canvas);
      setResults(classifications);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Classification failed';
      setResults([{ label: `Error: ${errorMsg}`, score: 0 }]);
    } finally {
      setLoading(false);
    }
  }, [image, loading]);

  const handleOCR = useCallback(async () => {
    if (!image || loading) return;
    setLoading(true);

    try {
      const img = imgRef.current;
      if (!img) throw new Error('Image not loaded');

      const canvas = canvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const prompt = 'Extract all text visible in this image. Return only the text content.';
      let text = '';
      const gen = await inferenceEngine.generate(prompt);
      for await (const token of gen) {
        text += token;
      }
      setOcrText(text);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'OCR failed';
      setOcrText(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [image, loading]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tab Selector */}
      <div className="card p-1.5 inline-flex gap-1">
        {(['classify', 'ocr'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium rounded-xl btn-press ease-transition ${
              activeTab === tab
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#86868B] dark:text-[#98989D]'
            }`}
          >
            {tab === 'classify' ? 'Image Classification' : 'OCR'}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      <div
        className="card p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ease-transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        {image ? (
          <div className="relative max-w-full">
            <img
              ref={imgRef}
              src={image}
              alt="Uploaded"
              className="max-h-80 rounded-xl object-contain"
              crossOrigin="anonymous"
            />
            <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-2 text-center">Click to change image</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-white">Drop image here</p>
            <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1">Supports PNG, JPG, WebP</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action Button */}
      {image && (
        <div className="flex justify-center">
          <button
            onClick={activeTab === 'classify' ? handleClassify : handleOCR}
            disabled={loading}
            className="px-8 py-3 text-sm font-medium rounded-2xl bg-[#007AFF] text-white disabled:opacity-40 disabled:cursor-not-allowed btn-press ease-transition shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Processing...
              </>
            ) : (
              activeTab === 'classify' ? 'Classify Image' : 'Extract Text'
            )}
          </button>
        </div>
      )}

      {/* Classification Results */}
      {activeTab === 'classify' && results.length > 0 && (
        <div className="card p-4 animate-fade-in">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">Classification Results</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-[#1D1D1F] dark:text-white w-40 truncate">{r.label}</span>
                <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#007AFF] ease-transition"
                    style={{ width: `${(r.score * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="text-xs text-[#86868B] dark:text-[#98989D] w-14 text-right">
                  {(r.score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Result */}
      {activeTab === 'ocr' && ocrText && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">Extracted Text</span>
            <button
              onClick={() => navigator.clipboard.writeText(ocrText)}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#86868B] dark:text-[#98989D] hover:text-[#007AFF] btn-press ease-transition"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-[#1D1D1F] dark:text-white leading-relaxed whitespace-pre-wrap">
            {ocrText}
          </p>
        </div>
      )}
    </div>
  );
}
