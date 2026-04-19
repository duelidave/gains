import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { WorkoutDraft } from '../models/WorkoutDraft';
import { workoutDraftSchema, validateBody } from '../validation/schemas';

const router = Router();

// GET /api/workouts/draft
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doc = await WorkoutDraft.findOne({ userId: req.user!.keycloakId });
    if (!doc) {
      res.status(204).end();
      return;
    }
    res.json({ state: doc.state });
  } catch (err) {
    next(err);
  }
});

// PUT /api/workouts/draft
router.put('/', validateBody(workoutDraftSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await WorkoutDraft.findOneAndUpdate(
      { userId: req.user!.keycloakId },
      { userId: req.user!.keycloakId, state: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workouts/draft
router.delete('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await WorkoutDraft.deleteOne({ userId: req.user!.keycloakId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
