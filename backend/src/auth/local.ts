import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { User } from '../models/User';
import { sendProblem } from '../middleware/errorHandler';
import { validateBody } from '../validation/schemas';
import { AuthModule } from './types';

const JWT_ISSUER = 'gains';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required when AUTH_PROVIDER=local');
  }
  return secret;
}

function signAccessToken(userId: string, email: string, displayName: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      preferred_username: displayName,
      type: 'access',
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY, issuer: JWT_ISSUER },
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh',
    },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY, issuer: JWT_ISSUER },
  );
}

export function createLocalAuth(): AuthModule {
  const allowRegistration = process.env.ALLOW_REGISTRATION === 'true';

  // Validate JWT_SECRET on startup
  getJwtSecret();

  const middleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendProblem(res, 401, 'Missing or invalid Authorization header', req.originalUrl);
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'], issuer: JWT_ISSUER }) as Record<
        string,
        unknown
      >;

      if (decoded.type !== 'access') {
        sendProblem(res, 401, 'Invalid token type', req.originalUrl);
        return;
      }

      req.user = {
        keycloakId: decoded.sub as string,
        username: (decoded.preferred_username as string) || '',
        email: (decoded.email as string) || '',
      };

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      console.error('Local JWT verification failed:', message);
      sendProblem(res, 401, 'Invalid or expired token', req.originalUrl);
    }
  };

  const router = Router();

  // Public config endpoint
  router.get('/config', (_req, res) => {
    res.json({
      provider: 'local',
      registrationEnabled: allowRegistration,
    });
  });

  // Register
  router.post('/register', validateBody(registerSchema), async (req: AuthRequest, res: Response) => {
    if (!allowRegistration) {
      sendProblem(res, 403, 'Registration is disabled', req.originalUrl);
      return;
    }

    const { email, password, displayName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      sendProblem(res, 409, 'An account with this email already exists', req.originalUrl);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      keycloakId: `local_${crypto.randomUUID()}`,
      displayName,
      email,
      passwordHash,
      settings: {},
    });

    const accessToken = signAccessToken(user.keycloakId, user.email, user.displayName);
    const refreshToken = signRefreshToken(user.keycloakId);

    res.status(201).json({ accessToken, refreshToken });
  });

  // Login
  router.post('/login', validateBody(loginSchema), async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      sendProblem(res, 401, 'Invalid email or password', req.originalUrl);
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      sendProblem(res, 401, 'Invalid email or password', req.originalUrl);
      return;
    }

    const accessToken = signAccessToken(user.keycloakId, user.email, user.displayName);
    const refreshToken = signRefreshToken(user.keycloakId);

    res.json({ accessToken, refreshToken });
  });

  // Refresh
  router.post('/refresh', validateBody(refreshSchema), async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(refreshToken, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
      }) as Record<string, unknown>;

      if (decoded.type !== 'refresh') {
        sendProblem(res, 401, 'Invalid token type', req.originalUrl);
        return;
      }

      const user = await User.findOne({ keycloakId: decoded.sub as string });
      if (!user) {
        sendProblem(res, 401, 'User not found', req.originalUrl);
        return;
      }

      const accessToken = signAccessToken(user.keycloakId, user.email, user.displayName);
      const newRefreshToken = signRefreshToken(user.keycloakId);

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch {
      sendProblem(res, 401, 'Invalid or expired refresh token', req.originalUrl);
    }
  });

  return { middleware, router };
}
