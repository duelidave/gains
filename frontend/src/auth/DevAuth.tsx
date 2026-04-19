import { useEffect, type ReactNode } from 'react';
import { AuthContext } from './AuthProvider';
import { setTokenGetter } from './tokenStore';

interface Props {
  children: ReactNode;
}

export function DevAuthProvider({ children }: Props) {
  useEffect(() => {
    setTokenGetter(async () => null);
  }, []);

  const value = {
    initialized: true,
    authenticated: true,
    username: 'Dev',
    email: 'dev@local',
    fullName: 'Dev User',
    login: () => {},
    logout: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
