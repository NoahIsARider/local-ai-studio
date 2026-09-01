import { useEffect, useState } from 'react';
import { useAppState, useAppDispatch } from '../store';

export function useTheme() {
  const { theme, resolvedTheme } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        dispatch({ type: 'SET_RESOLVED_THEME', payload: mq.matches ? 'dark' : 'light' });
      }
    };
    mq.addEventListener('change', handler);
    handler();
    return () => mq.removeEventListener('change', handler);
  }, [theme, dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.body.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: t });
    if (t !== 'system') {
      dispatch({ type: 'SET_RESOLVED_THEME', payload: t });
    }
  };

  return { theme, resolvedTheme, setTheme };
}

export function ThemeToggle() {
  const { theme } = useAppState();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Auto' },
  ];

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/5 dark:bg-white/10">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => dispatch({ type: 'SET_THEME', payload: opt.value })}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg btn-press ease-transition ${
            theme === opt.value
              ? 'bg-white dark:bg-white/20 text-[#1D1D1F] dark:text-white shadow-sm'
              : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
