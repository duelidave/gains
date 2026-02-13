import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import { AuthContext } from './AuthProvider';
import { setTokenGetter } from './tokenStore';
import type { KeycloakConfig } from './types';

interface Props {
  config: KeycloakConfig;
  children: ReactNode;
}

export function KeycloakAuthProvider({ config, children }: Props) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [keycloak] = useState(
    () =>
      new Keycloak({
        url: config.url,
        realm: config.realm,
        clientId: config.clientId,
      }),
  );

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      })
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);

        setTokenGetter(async () => {
          if (keycloak.isTokenExpired(30)) {
            try {
              await keycloak.updateToken(30);
            } catch {
              keycloak.login();
              return null;
            }
          }
          return keycloak.token || null;
        });

        // Auto-refresh token
        setInterval(() => {
          keycloak.updateToken(60).catch(() => {
            keycloak.login();
          });
        }, 30000);
      })
      .catch(() => {
        setInitialized(true);
      });
  }, [keycloak]);

  const login = useCallback(() => keycloak.login(), [keycloak]);
  const logout = useCallback(
    () => keycloak.logout({ redirectUri: window.location.origin }),
    [keycloak],
  );

  const profile = keycloak.tokenParsed;
  const username = profile?.preferred_username || '';
  const email = profile?.email || '';
  const fullName = profile?.name || profile?.given_name || username;

  return (
    <AuthContext.Provider
      value={{ initialized, authenticated, username, email, fullName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
