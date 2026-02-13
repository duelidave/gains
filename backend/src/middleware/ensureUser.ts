import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types';

export async function ensureUserMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jwtUser = req.user!;
    let user = await User.findOne({ keycloakId: jwtUser.keycloakId });
    if (!user) {
      user = await User.create({
        keycloakId: jwtUser.keycloakId,
        displayName: jwtUser.username,
        email: jwtUser.email,
        settings: {},
      });
    }
    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
