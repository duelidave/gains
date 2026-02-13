import { AuthModule, AuthProviderType } from './types';
import { createKeycloakAuth } from './keycloak';
import { createOidcAuth } from './oidc';
import { createLocalAuth } from './local';

export function createAuthModule(): AuthModule {
  const provider = (process.env.AUTH_PROVIDER || 'keycloak') as AuthProviderType;

  console.log(`Auth provider: ${provider}`);

  switch (provider) {
    case 'keycloak':
      return createKeycloakAuth();
    case 'oidc':
      return createOidcAuth();
    case 'local':
      return createLocalAuth();
    default:
      throw new Error(`Unknown AUTH_PROVIDER: ${provider}. Must be keycloak, oidc, or local.`);
  }
}
