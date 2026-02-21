import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ExerciseService } from '../services/ExerciseService';
import { mergeExercisesSchema, validateBody } from '../validation/schemas';

const router = Router();

// GET /api/exercises — unique exercise names for the user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await ExerciseService.getNames(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// POST /api/exercises/merge — merge one exercise name into another
router.post('/merge', validateBody(mergeExercisesSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.body;
    if (from === to) {
      res.json({ modified: 0 });
      return;
    }
    const modified = await ExerciseService.merge(req.user!.keycloakId, from, to);
    res.json({ modified });
  } catch (err) {
    next(err);
  }
});

export default router;
