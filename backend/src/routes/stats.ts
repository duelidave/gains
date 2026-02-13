import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { StatsService } from '../services/StatsService';

const router = Router();

// GET /api/stats/streak
router.get('/streak', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await StatsService.getStreak(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/weekly
router.get('/weekly', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await StatsService.getWeekly(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/volume
router.get('/volume', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await StatsService.getVolume(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/top-exercises
router.get('/top-exercises', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    res.json(await StatsService.getTopExercises(req.user!.keycloakId, limit));
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/overview
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await StatsService.getOverview(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/history
router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await StatsService.getHistory(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

export default router;
