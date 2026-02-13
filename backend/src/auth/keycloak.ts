import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { AuthModule } from './types';

export function createKeycloakAuth(): AuthModule {
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
  const realm = process.env.KEYCLOAK_REALM || 'gains';
  const clientId = process.env.KEYCLOAK_CLIENT_ID || 'gains';

  const client = jwksClient({
    jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
    cache: true,
    cacheMaxAge: 600000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
    if (!header.kid) {
      callback(new Error('No kid in JWT header'));
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, key?.getPublicKey());
    });
  }

  const middleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendProblem(res, 401, 'Missing or invalid Authorization header', req.originalUrl);
      return;
    }

    const token = authHeader.substring(7);

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `${process.env.KEYCLOAK_PUBLIC_URL || keycloakUrl}/realms/${realm}`,
      },
      (err, decoded) => {
        if (err) {
          console.error('JWT verification failed:', err.message);
          sendProblem(res, 401, 'Invalid or expired token', req.originalUrl);
          return;
        }

        const payload = decoded as Record<string, unknown>;
        req.user = {
          keycloakId: payload.sub as string,
          username: (payload.preferred_username as string) || '',
          email: (payload.email as string) || '',
        };

        next();
      },
    );
  };

  const router = Router();

  router.get('/config', (_req, res) => {
    res.json({
      provider: 'keycloak',
      url: process.env.KEYCLOAK_PUBLIC_URL || keycloakUrl,
      realm,
      clientId,
    });
  });

  return { middleware, router };
}
