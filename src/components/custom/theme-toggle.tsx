import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import CustomTooltip from './custom-tooltip';

const STORAGE_KEY = 'mcm-theme';

type Theme = 'light' | 'dark';

const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

/**
 * Light/dark switch for the console top bar.
 *
 * `index.css` already carries a full `.dark` token set; nothing was setting the
 * class, so the palette was unreachable. This is the switch that reaches it,
 * persisted so a reload keeps the choice.
 *
 * It deliberately does not follow `prefers-color-scheme`: the app has always
 * rendered light, and silently flipping every existing user to dark because of
 * an OS setting would be a bigger change than adding a button.
 */
const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* a blocked storage write must not stop the switch working this session */
      }
      return next;
    });
  }, []);

  return (
    <CustomTooltip text={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} side="bottom">
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-pressed={theme === 'dark'}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/70 bg-white/70 shadow-sm text-gray-700 transition-colors hover:bg-ucass-primary-200 hover:border-ucass-primary-100 hover:text-primary"
      >
        {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
      </button>
    </CustomTooltip>
  );
};

export default ThemeToggle;
