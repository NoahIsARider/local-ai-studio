import { useState, useRef, useCallback } from 'react';
import { inferenceEngine } from '../engine/inference-engine';

type TaskMode = 'chat' | 'summarize' | 'translate' | 'rewrite' | 'classify';

const taskModes: Array<{ key: TaskMode; label: string }> = [
  { key: 'chat', label: 'Chat' },
  { key: 'summarize', label: 'Summarize' },
  { key: 'translate', label: 'Translate' },
  { key: 'rewrite', label: 'Rewrite' },
  { key: 'classify', label: 'Classify' },
];

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export default function TextWorkbench() {
  const [mode, setMode] = useState<TaskMode>('chat');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [srcLang, setSrcLang] = useState('en');
  const [tgtLang, setTgtLang] = useState('zh');
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    setOutput('');
    abortRef.current = new AbortController();

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      let result = '';

      switch (mode) {
        case 'chat': {
          const gen = await inferenceEngine.generate(input, {
            systemPrompt: 'You are a helpful assistant. Be concise and accurate.',
            signal: abortRef.current.signal,
          });
          for await (const token of gen) {
            result += token;
            setOutput(result);
          }
          break;
        }
        case 'summarize': {
          const prompt = `Summarize the following text concisely:\n\n${input}`;
          const gen = await inferenceEngine.generate(prompt, {
            signal: abortRef.current.signal,
          });
          for await (const token of gen) {
            result += token;
            setOutput(result);
          }
          break;
        }
        case 'translate': {
          result = await inferenceEngine.translate(input, srcLang, tgtLang);
          setOutput(result);
          break;
        }
        case 'rewrite': {
          const prompt = `Rewrite the following text to be more clear and professional:\n\n${input}`;
          const gen = await inferenceEngine.generate(prompt, {
            signal: abortRef.current.signal,
          });
          for await (const token of gen) {
            result += token;
            setOutput(result);
          }
          break;
        }
        case 'classify': {
          const prompt = `Classify the following text into categories (news, tech, science, sports, entertainment, other). Return only the category name:\n\n${input}`;
          const gen = await inferenceEngine.generate(prompt, {
            signal: abortRef.current.signal,
          });
          for await (const token of gen) {
            result += token;
            setOutput(result);
          }
          break;
        }
      }

      const assistantMsg: Message = { role: 'assistant', content: result, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setOutput(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, srcLang, tgtLang]);

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Selector */}
      <div className="card p-1.5 inline-flex gap-1">
        {taskModes.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl btn-press ease-transition ${
              mode === m.key
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Translation Language Selectors */}
      {mode === 'translate' && (
        <div className="card p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#86868B] dark:text-[#98989D]">From:</label>
            <select
              value={srcLang}
              onChange={e => setSrcLang(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-sm border-none outline-none text-[#1D1D1F] dark:text-white"
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#86868B]">
            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#86868B] dark:text-[#98989D]">To:</label>
            <select
              value={tgtLang}
              onChange={e => setTgtLang(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-sm border-none outline-none text-[#1D1D1F] dark:text-white"
            >
              <option value="zh">Chinese</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="card p-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            mode === 'chat' ? 'Type your message...' :
            mode === 'summarize' ? 'Paste text to summarize...' :
            mode === 'translate' ? 'Enter text to translate...' :
            mode === 'rewrite' ? 'Enter text to rewrite...' :
            'Enter text to classify...'
          }
          className="w-full h-32 resize-none bg-transparent text-sm text-[#1D1D1F] dark:text-white placeholder-[#86868B]/50 outline-none"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
          <span className="text-xs text-[#86868B] dark:text-[#98989D]">
            {input.length} characters
          </span>
          <div className="flex gap-2">
            {loading && (
              <button
                onClick={handleStop}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-[#FF3B30]/10 text-[#FF3B30] btn-press ease-transition"
              >
                Stop
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || loading}
              className="px-5 py-2 text-sm font-medium rounded-xl bg-[#007AFF] text-white disabled:opacity-40 disabled:cursor-not-allowed btn-press ease-transition shadow-sm"
            >
              {loading ? 'Processing...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Output Area */}
      {(output || loading) && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">Output</span>
          </div>
          <div
            ref={outputRef}
            className={`text-sm text-[#1D1D1F] dark:text-white leading-relaxed whitespace-pre-wrap ${
              loading ? 'streaming-cursor' : ''
            }`}
          >
            {output || 'Waiting for response...'}
          </div>
        </div>
      )}

      {/* Chat History */}
      {mode === 'chat' && messages.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">Conversation History</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-white'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
