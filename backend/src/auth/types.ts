import { Response, NextFunction, Router } from 'express';
import { AuthRequest } from '../types';

export type AuthProviderType = 'keycloak' | 'oidc' | 'local';

export interface AuthModule {
  middleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
  router: Router;
}
