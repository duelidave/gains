import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthProvider';
import { setTokenGetter } from './tokenStore';
import { LoginPage } from './LoginPage';
import type { LocalConfig } from './types';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  preferred_username: string;
  exp: number;
  type: string;
}

function parseJwt(token: string): TokenPayload {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  try {
    const payload = parseJwt(token);
    return Date.now() >= (payload.exp - bufferSeconds) * 1000;
  } catch {
    return true;
  }
}

const STORAGE_KEY = 'fitness_auth_tokens';

function loadTokens(): Tokens | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  config: LocalConfig;
  children: ReactNode;
}

export function LocalAuthProvider({ config, children }: Props) {
  const [tokens, setTokens] = useState<Tokens | null>(loadTokens);
  const [initialized, setInitialized] = useState(false);

  // Derive auth state from tokens
  const authenticated = tokens !== null && !isTokenExpired(tokens.accessToken, 0);
  let username = '';
  let email = '';
  let fullName = '';

  if (tokens) {
    try {
      const payload = parseJwt(tokens.accessToken);
      username = payload.preferred_username || '';
      email = payload.email || '';
      fullName = payload.preferred_username || '';
    } catch {
      // token parse error
    }
  }

  // Set up token getter for api.ts
  useEffect(() => {
    if (!tokens) return;

    setTokenGetter(async () => {
      const current = loadTokens();
      if (!current) return null;

      // If access token is still valid, return it
      if (!isTokenExpired(current.accessToken)) {
        return current.accessToken;
      }

      // Try to refresh
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });

        if (!res.ok) {
          clearTokens();
          setTokens(null);
          return null;
        }

        const newTokens: Tokens = await res.json();
        saveTokens(newTokens);
        setTokens(newTokens);
        return newTokens.accessToken;
      } catch {
        clearTokens();
        setTokens(null);
        return null;
      }
    });
  }, [tokens]);

  useEffect(() => {
    // Check if stored tokens are still valid
    const stored = loadTokens();
    if (stored && !isTokenExpired(stored.refreshToken, 0)) {
      setTokens(stored);
    } else if (stored) {
      clearTokens();
      setTokens(null);
    }
    setInitialized(true);
  }, []);

  const handleLogin = useCallback(async (loginEmail: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'Login failed');
    }

    const newTokens: Tokens = await res.json();
    saveTokens(newTokens);
    setTokens(newTokens);
  }, []);

  const handleRegister = useCallback(
    async (regEmail: string, password: string, displayName: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password, displayName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Registration failed');
      }

      const newTokens: Tokens = await res.json();
      saveTokens(newTokens);
      setTokens(newTokens);
    },
    [],
  );

  const login = useCallback(() => {
    // For local mode, clear tokens to show login page
    clearTokens();
    setTokens(null);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setTokens(null);
    setTokenGetter(async () => null);
  }, []);

  if (!initialized) return null;

  if (!authenticated) {
    return (
      <LoginPage
        registrationEnabled={config.registrationEnabled}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <AuthContext.Provider
      value={{ initialized, authenticated, username, email, fullName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
