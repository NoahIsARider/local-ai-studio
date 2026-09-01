import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';

/* ── Types ── */
export type ModuleKey = 'text' | 'voice' | 'vision' | 'rag' | 'models';

export interface ModelInfo {
  id: string;
  name: string;
  task: string;
  size: string;
  sizeBytes: number;
  status: 'not-downloaded' | 'downloading' | 'downloaded' | 'loading' | 'ready' | 'error';
  progress: number;
  speed?: string;
  backend: 'transformers' | 'chrome-ai';
  lastUsed?: number;
}

export interface AppState {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  activeModule: ModuleKey;
  models: ModelInfo[];
  chromeAIAvailable: boolean;
  chromeAIModels: Record<string, boolean>;
  sidebarCollapsed: boolean;
}

type Action =
  | { type: 'SET_THEME'; payload: AppState['theme'] }
  | { type: 'SET_RESOLVED_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_ACTIVE_MODULE'; payload: ModuleKey }
  | { type: 'UPDATE_MODEL'; payload: Partial<ModelInfo> & { id: string } }
  | { type: 'SET_MODELS'; payload: ModelInfo[] }
  | { type: 'SET_CHROME_AI'; payload: { available: boolean; models: Record<string, boolean> } }
  | { type: 'TOGGLE_SIDEBAR' };

const initialModels: ModelInfo[] = [
  { id: 'llm-small', name: 'Phi-3.5 Mini (Q4)', task: 'text-generation', size: '2.2 GB', sizeBytes: 2.2e9, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'summarizer', name: 'BART CNN Summarization', task: 'summarization', size: '420 MB', sizeBytes: 420e6, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'translator', name: 'M2M-100 (418M)', task: 'translation', size: '2.4 GB', sizeBytes: 2.4e9, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'whisper-tiny', name: 'Whisper Tiny (EN)', task: 'automatic-speech-recognition', size: '75 MB', sizeBytes: 75e6, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'whisper-small', name: 'Whisper Small', task: 'automatic-speech-recognition', size: '465 MB', sizeBytes: 465e6, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'vit-base', name: 'ViT Base Patch16', task: 'image-classification', size: '330 MB', sizeBytes: 330e6, status: 'not-downloaded', progress: 0, backend: 'transformers' },
  { id: 'embedding', name: 'All-MiniLM-L6-v2', task: 'feature-extraction', size: '80 MB', sizeBytes: 80e6, status: 'not-downloaded', progress: 0, backend: 'transformers' },
];

const initialState: AppState = {
  theme: 'system',
  resolvedTheme: 'light',
  activeModule: 'text',
  models: initialModels,
  chromeAIAvailable: false,
  chromeAIModels: {},
  sidebarCollapsed: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_RESOLVED_THEME':
      return { ...state, resolvedTheme: action.payload };
    case 'SET_ACTIVE_MODULE':
      return { ...state, activeModule: action.payload };
    case 'UPDATE_MODEL': {
      const models = state.models.map(m =>
        m.id === action.payload.id ? { ...m, ...action.payload } : m
      );
      return { ...state, models };
    }
    case 'SET_MODELS':
      return { ...state, models: action.payload };
    case 'SET_CHROME_AI':
      return { ...state, chromeAIAvailable: action.payload.available, chromeAIModels: action.payload.models };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    default:
      return state;
  }
}

const StateCtx = createContext<AppState>(initialState);
const DispatchCtx = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useAppState() {
  return useContext(StateCtx);
}

export function useAppDispatch() {
  return useContext(DispatchCtx);
}
