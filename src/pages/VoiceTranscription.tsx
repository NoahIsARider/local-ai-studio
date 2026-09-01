import { useState, useRef, useCallback } from 'react';
import { inferenceEngine } from '../engine/inference-engine';

export default function VoiceTranscription() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [modelId, setModelId] = useState('whisper-tiny');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|webm|flac|m4a)$/i)) {
      alert('Please select a valid audio file (WAV, MP3, OGG, FLAC, M4A)');
      return;
    }

    setAudioFile(file);
    setTranscription('');

    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioFile || loading) return;

    setLoading(true);
    setTranscription('');

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const float32Data = audioBuffer.getChannelData(0);

      const result = await inferenceEngine.transcribe(float32Data, { modelId });
      setTranscription(result);
      await audioContext.close();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
      setTranscription(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [audioFile, loading, modelId]);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Model Selector */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-[#1D1D1F] dark:text-white">ASR Model:</label>
        <div className="flex gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/10">
          {[
            { id: 'whisper-tiny', label: 'Tiny (75MB)' },
            { id: 'whisper-small', label: 'Small (465MB)' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg btn-press ease-transition ${
                modelId === m.id
                  ? 'bg-white dark:bg-white/20 text-[#1D1D1F] dark:text-white shadow-sm'
                  : 'text-[#86868B] dark:text-[#98989D]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className="card p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ease-transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <path d="M12 17v4" />
            <path d="M8 21h8" />
          </svg>
        </div>
        {audioFile ? (
          <div className="text-center">
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-white">{audioFile.name}</p>
            <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1">
              {(audioFile.size / 1024 / 1024).toFixed(1)} MB
              {duration > 0 && ` · ${formatDuration(duration)}`}
            </p>
            <p className="text-xs text-[#007AFF] mt-2">Click to change</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-[#1D1D1F] dark:text-white">Drop audio file here</p>
            <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1">
              Supports WAV, MP3, OGG, FLAC, M4A
            </p>
          </div>
        )}
      </div>

      {/* Audio Preview */}
      {audioFile && (
        <div className="card p-4">
          <audio
            ref={audioRef}
            controls
            src={URL.createObjectURL(audioFile)}
            className="w-full h-10"
          />
        </div>
      )}

      {/* Transcribe Button */}
      <div className="flex justify-center">
        <button
          onClick={handleTranscribe}
          disabled={!audioFile || loading}
          className="px-8 py-3 text-sm font-medium rounded-2xl bg-[#007AFF] text-white disabled:opacity-40 disabled:cursor-not-allowed btn-press ease-transition shadow-sm flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Transcribing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5Z" />
              </svg>
              Transcribe
            </>
          )}
        </button>
      </div>

      {/* Transcription Result */}
      {transcription && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">Transcription</span>
            <button
              onClick={() => navigator.clipboard.writeText(transcription)}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-black/5 dark:bg-white/10 text-[#86868B] dark:text-[#98989D] hover:text-[#007AFF] btn-press ease-transition"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-[#1D1D1F] dark:text-white leading-relaxed whitespace-pre-wrap">
            {transcription}
          </p>
        </div>
      )}
    </div>
  );
}
