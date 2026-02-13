import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ExerciseService } from '../services/ExerciseService';

const router = Router();

// GET /api/exercises — unique exercise names for the user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await ExerciseService.getNames(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

export default router;
