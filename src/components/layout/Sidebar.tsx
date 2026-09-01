import { useAppState, useAppDispatch, type ModuleKey } from '../../store';

const modules: Array<{ key: ModuleKey; label: string; icon: string }> = [
  { key: 'text', label: 'Text', icon: 'text' },
  { key: 'voice', label: 'Voice', icon: 'mic' },
  { key: 'vision', label: 'Vision', icon: 'eye' },
  { key: 'rag', label: 'RAG', icon: 'doc' },
  { key: 'models', label: 'Models', icon: 'cpu' },
];

function ModuleIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#007AFF' : 'currentColor';
  const size = 20;

  switch (type) {
    case 'text':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
        </svg>
      );
    case 'mic':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v4" /><path d="M8 21h8" />
        </svg>
      );
    case 'eye':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'doc':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
        </svg>
      );
    case 'cpu':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
  const { activeModule, sidebarCollapsed } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <aside className={`glass fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-black/5 dark:border-white/5 ease-transition ${
      sidebarCollapsed ? 'w-16' : 'w-56'
    }`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-black/5 dark:border-white/5">
        <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm text-[#1D1D1F] dark:text-white whitespace-nowrap">
            Local AI Studio
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {modules.map(mod => {
          const active = activeModule === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', payload: mod.key })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium btn-press ease-transition ${
                active
                  ? 'bg-[#007AFF]/10 text-[#007AFF]'
                  : 'text-[#86868B] dark:text-[#98989D] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <ModuleIcon type={mod.icon} active={active} />
              {!sidebarCollapsed && <span>{mod.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-black/5 dark:border-white/5">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="w-full flex items-center justify-center p-2 rounded-xl text-[#86868B] hover:bg-black/5 dark:hover:bg-white/5 btn-press ease-transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
