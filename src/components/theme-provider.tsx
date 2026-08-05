'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ResolvedTheme,
  type Theme,
} from '@/components/theme';

type ThemeContextValue = {
  /** Kullanıcının seçimi ('system' = seçim yok). Sunucudan gelir, hidrasyonda kaymaz. */
  theme: Theme;
  /** Ekranda gerçekten uygulanan tema. İlk render'da `undefined` — sunucu sistem tercihini bilemez. */
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * `<html>` sınıfını ve tema cookie'sini eşitler.
 * Sınıf değişimi sırasında bir kare boyunca geçişler kapatılır (`.theme-switching`),
 * yoksa renk geçişleri temalar arasında "yayılma" etkisi yapıyor.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.classList.add('theme-switching');
  root.classList.remove('light', 'dark');
  if (theme !== 'system') {
    root.classList.add(theme);
  }

  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax` + secure;

  window.requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  /** Kök layout'un cookie'den okuduğu değer. */
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [systemDark, setSystemDark] = useState<boolean | null>(null);

  // Sistem tercihini izle. `theme === 'system'` iken renkleri zaten CSS medya
  // sorgusu değiştiriyor; buradaki durum yalnızca `resolvedTheme`'i besler.
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const sync = () => setSystemDark(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedTheme: ResolvedTheme | undefined =
      theme === 'system'
        ? systemDark === null
          ? undefined
          : systemDark
            ? 'dark'
            : 'light'
        : theme;

    return { theme, resolvedTheme, setTheme };
  }, [theme, systemDark, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  }
  return context;
}
