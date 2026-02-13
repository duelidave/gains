import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createAuthModule } from './auth';
import { ensureUserMiddleware } from './middleware/ensureUser';
import { errorHandler, sendProblem } from './middleware/errorHandler';
import { AuthRequest } from './types';
import healthRouter from './routes/health';
import workoutRouter from './routes/workouts';
import statsRouter from './routes/stats';
import userRouter from './routes/user';
import settingsRouter from './routes/settings';
import progressRouter from './routes/progress';
import exercisesRouter from './routes/exercises';
import parseRouter from './routes/parse';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(morgan('short'));
  app.use(express.json({ limit: '50kb' }));

  // Global rate limiter: 100 requests per 15 minutes
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      return authReq.user?.keycloakId || req.ip || 'unknown';
    },
    handler: (req, res) => {
      sendProblem(res, 429, 'Too many requests, please try again later', req.originalUrl);
    },
  });

  // Parse route rate limiter: 10 requests per minute (applied after auth)
  const parseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      return authReq.user?.keycloakId || req.ip || 'unknown';
    },
    handler: (req, res) => {
      sendProblem(res, 429, 'Too many parse requests, please try again later', req.originalUrl);
    },
  });

  // Login rate limiter: 5 attempts per minute per IP
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      sendProblem(res, 429, 'Too many login attempts, please try again later', req.originalUrl);
    },
  });

  app.use(globalLimiter);

  // Initialize auth module
  const auth = createAuthModule();

  // Unprotected routes
  app.use('/api', healthRouter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', loginLimiter);
  app.use('/api/auth', auth.router);

  // Protected routes — auth + ensureUser on all
  app.use('/api/workouts/parse', auth.middleware, ensureUserMiddleware, parseLimiter, parseRouter);
  app.use('/api/workouts', auth.middleware, ensureUserMiddleware, workoutRouter);
  app.use('/api/stats', auth.middleware, ensureUserMiddleware, statsRouter);
  app.use('/api/user', auth.middleware, ensureUserMiddleware, userRouter);
  app.use('/api/settings', auth.middleware, ensureUserMiddleware, settingsRouter);
  app.use('/api/progress', auth.middleware, ensureUserMiddleware, progressRouter);
  app.use('/api/exercises', auth.middleware, ensureUserMiddleware, exercisesRouter);

  // Global error handler (RFC 9457)
  app.use(errorHandler);

  return app;
}

async function startServer(): Promise<void> {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI environment variable is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  const app = createApp();
  const PORT = parseInt(process.env.PORT || '4000', 10);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

startServer();
