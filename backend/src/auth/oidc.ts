import { Router, Response, NextFunction } from 'express';
import * as jose from 'jose';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { AuthModule } from './types';

export function createOidcAuth(): AuthModule {
  const issuerUrl = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID || '';
  const scopes = process.env.OIDC_SCOPES || 'openid profile email';

  if (!issuerUrl) {
    throw new Error('OIDC_ISSUER_URL is required when AUTH_PROVIDER=oidc');
  }

  let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
  let issuer: string = issuerUrl;

  // Lazily discover OIDC configuration and cache JWKS
  async function getJWKS(): Promise<ReturnType<typeof jose.createRemoteJWKSet>> {
    if (jwks) return jwks;

    const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
    const res = await fetch(discoveryUrl);
    if (!res.ok) {
      throw new Error(`OIDC discovery failed: ${res.status}`);
    }
    const config = (await res.json()) as { jwks_uri: string; issuer: string };
    issuer = config.issuer;
    jwks = jose.createRemoteJWKSet(new URL(config.jwks_uri));
    return jwks;
  }

  // Warm up JWKS on startup
  getJWKS().catch((err) => {
    console.error('OIDC discovery failed (will retry on first request):', err.message);
    jwks = null;
  });

  const middleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendProblem(res, 401, 'Missing or invalid Authorization header', req.originalUrl);
      return;
    }

    const token = authHeader.substring(7);

    try {
      const keySet = await getJWKS();
      const { payload } = await jose.jwtVerify(token, keySet, {
        issuer,
        audience: clientId || undefined,
      });

      req.user = {
        keycloakId: payload.sub || '',
        username: (payload.preferred_username as string) || (payload.name as string) || '',
        email: (payload.email as string) || '',
      };

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      console.error('OIDC JWT verification failed:', message);
      sendProblem(res, 401, 'Invalid or expired token', req.originalUrl);
    }
  };

  const router = Router();

  router.get('/config', (_req, res) => {
    res.json({
      provider: 'oidc',
      authority: issuerUrl,
      clientId,
      scopes,
    });
  });

  return { middleware, router };
}
