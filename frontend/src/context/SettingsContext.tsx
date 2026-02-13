import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSettings, updateSettings as apiUpdateSettings } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from './ThemeContext';
import type { UserSettings } from '../types';
import i18n from '../i18n';

interface SettingsState {
  settings: UserSettings;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const defaults: UserSettings = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  darkMode: true,
  language: 'en',
};

const SettingsContext = createContext<SettingsState>({
  settings: defaults,
  updateSettings: async () => {},
  loading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const { setDark } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) return;
    getSettings()
      .then((s) => {
        const merged = { ...defaults, ...s };
        setSettings(merged);
        setDark(merged.darkMode);
        if (merged.language && merged.language !== i18n.language) {
          i18n.changeLanguage(merged.language);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated, setDark]);

  const updateSettingsHandler = async (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);

    if (partial.darkMode !== undefined) {
      setDark(partial.darkMode);
    }
    if (partial.language) {
      i18n.changeLanguage(partial.language);
    }

    try {
      await apiUpdateSettings(partial);
    } catch {
      // revert on error
      setSettings(settings);
      if (partial.darkMode !== undefined) {
        setDark(settings.darkMode);
      }
      if (partial.language) {
        i18n.changeLanguage(settings.language);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings: updateSettingsHandler, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
