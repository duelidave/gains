import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeState>({ dark: true, toggle: () => {}, setDark: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // dark mode default
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDarkState((d) => !d), []);
  const setDark = useCallback((v: boolean) => setDarkState(v), []);

  return <ThemeContext.Provider value={{ dark, toggle, setDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
