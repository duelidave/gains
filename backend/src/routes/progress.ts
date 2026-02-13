import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ProgressService } from '../services/ProgressService';

const router = Router();

// GET /api/progress?exercise=&period=
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const exerciseName = (req.query.exercise as string) || '';
    const period = (req.query.period as string) || '3M';
    res.json(await ProgressService.getProgression(req.user!.keycloakId, exerciseName, period));
  } catch (err) {
    next(err);
  }
});

export default router;
