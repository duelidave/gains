import { Request } from 'express';
import type { IUser } from './models/User';

export interface JwtUser {
  keycloakId: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtUser;
  dbUser?: IUser;
}
