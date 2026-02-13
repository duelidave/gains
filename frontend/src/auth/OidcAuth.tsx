import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { AuthContext } from './AuthProvider';
import { setTokenGetter } from './tokenStore';
import type { OidcConfig } from './types';

interface Props {
  config: OidcConfig;
  children: ReactNode;
}

export function OidcAuthProvider({ config, children }: Props) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const managerRef = useRef<UserManager | null>(null);

  useEffect(() => {
    const mgr = new UserManager({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: window.location.origin + '/',
      post_logout_redirect_uri: window.location.origin + '/',
      scope: config.scopes,
      response_type: 'code',
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      automaticSilentRenew: true,
    });
    managerRef.current = mgr;

    async function init() {
      try {
        // Handle callback if we're returning from the OIDC provider
        if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
          const user = await mgr.signinRedirectCallback();
          window.history.replaceState({}, document.title, window.location.pathname);
          setUsername(user.profile.preferred_username || user.profile.name || '');
          setEmail((user.profile.email as string) || '');
          setFullName(user.profile.name || user.profile.preferred_username || '');
          setAuthenticated(true);
          setInitialized(true);

          setTokenGetter(async () => {
            const u = await mgr.getUser();
            if (!u || u.expired) {
              await mgr.signinRedirect();
              return null;
            }
            return u.access_token;
          });
          return;
        }

        // Check if we already have a session
        const user = await mgr.getUser();
        if (user && !user.expired) {
          setUsername(user.profile.preferred_username || user.profile.name || '');
          setEmail((user.profile.email as string) || '');
          setFullName(user.profile.name || user.profile.preferred_username || '');
          setAuthenticated(true);
          setInitialized(true);

          setTokenGetter(async () => {
            const u = await mgr.getUser();
            if (!u || u.expired) {
              await mgr.signinRedirect();
              return null;
            }
            return u.access_token;
          });
        } else {
          // No session, redirect to login
          await mgr.signinRedirect();
        }
      } catch (err) {
        console.error('OIDC init error:', err);
        setInitialized(true);
      }
    }

    init();
  }, [config.authority, config.clientId, config.scopes]);

  const login = useCallback(() => {
    managerRef.current?.signinRedirect();
  }, []);

  const logout = useCallback(() => {
    managerRef.current?.signoutRedirect();
  }, []);

  return (
    <AuthContext.Provider
      value={{ initialized, authenticated, username, email, fullName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
