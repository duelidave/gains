import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { KeycloakAuthProvider } from './KeycloakAuth';
import { OidcAuthProvider } from './OidcAuth';
import { LocalAuthProvider } from './LocalAuth';
import type { AuthState, AuthConfig } from './types';

export const AuthContext = createContext<AuthState>({
  initialized: false,
  authenticated: false,
  username: '',
  email: '',
  fullName: '',
  login: () => {},
  logout: () => {},
});

function ConfigLoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
      <Dumbbell size={48} className="text-blue-500 animate-pulse" />
      <Skeleton className="h-4 w-48" />
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t('common.connecting', 'Connecting...')}</p>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => {
        if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: AuthConfig) => setConfig(data))
      .catch((err) => {
        console.error('Failed to fetch auth config:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
        <Dumbbell size={48} className="text-red-500" />
        <p className="text-red-600 dark:text-red-400 text-sm">Failed to load auth configuration</p>
      </div>
    );
  }

  if (!config) return <ConfigLoadingScreen />;

  switch (config.provider) {
    case 'keycloak':
      return <KeycloakAuthProvider config={config}>{children}</KeycloakAuthProvider>;
    case 'oidc':
      return <OidcAuthProvider config={config}>{children}</OidcAuthProvider>;
    case 'local':
      return <LocalAuthProvider config={config}>{children}</LocalAuthProvider>;
  }
}

export function useAuth() {
  return useContext(AuthContext);
}
