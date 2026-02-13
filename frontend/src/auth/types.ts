export interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  username: string;
  email: string;
  fullName: string;
  login: () => void;
  logout: () => void;
}

export interface KeycloakConfig {
  provider: 'keycloak';
  url: string;
  realm: string;
  clientId: string;
}

export interface OidcConfig {
  provider: 'oidc';
  authority: string;
  clientId: string;
  scopes: string;
}

export interface LocalConfig {
  provider: 'local';
  registrationEnabled: boolean;
}

export type AuthConfig = KeycloakConfig | OidcConfig | LocalConfig;
