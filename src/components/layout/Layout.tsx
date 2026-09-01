import { ThemeToggle } from '../../hooks/useTheme';
import { useAppState } from '../../store';
import { Sidebar } from './Sidebar';

const moduleNames: Record<string, string> = {
  text: 'Text Workbench',
  voice: 'Voice Transcription',
  vision: 'Visual Understanding',
  rag: 'Local RAG',
  models: 'Model Manager',
};

export function Header() {
  const { activeModule, chromeAIAvailable, sidebarCollapsed } = useAppState();

  return (
    <header className="glass sticky top-0 z-20 h-14 flex items-center justify-between px-6 border-b border-black/5 dark:border-white/5">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">
          {moduleNames[activeModule]}
        </h1>
        {chromeAIAvailable && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#34C759]/15 text-[#34C759]">
            Chrome AI
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppState();

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E]">
      <Sidebar />
      <div className={`ease-transition ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        <Header />
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
