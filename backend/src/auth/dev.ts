import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuthModule } from './types';

const DEV_USER = {
  keycloakId: 'dev-user',
  username: 'Dev',
  email: 'dev@local',
};

export function createDevAuth(): AuthModule {
  console.warn('AUTH_PROVIDER=dev — NO AUTHENTICATION. Do not use in production.');

  const middleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    req.user = { ...DEV_USER };
    next();
  };

  const router = Router();
  router.get('/config', (_req, res) => {
    res.json({ provider: 'dev' });
  });

  return { middleware, router };
}
