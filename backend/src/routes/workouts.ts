import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { WorkoutService } from '../services/WorkoutService';
import { createWorkoutSchema, updateWorkoutSchema, validateBody } from '../validation/schemas';
import { toWorkoutResponse, toWorkoutListResponse } from '../mappers';

const router = Router();

// List workouts with pagination and date filters
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await WorkoutService.list(req.user!.keycloakId, {
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10)),
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    res.json(toWorkoutListResponse(result));
  } catch (err) {
    next(err);
  }
});

// Create workout
router.post('/', validateBody(createWorkoutSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workout = await WorkoutService.create(req.user!.keycloakId, req.body);
    res.status(201).json(toWorkoutResponse(workout));
  } catch (err) {
    next(err);
  }
});

// Distinct workout titles for filter chips
router.get('/titles', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await WorkoutService.getDistinctTitles(req.user!.keycloakId));
  } catch (err) {
    next(err);
  }
});

// Get latest workout by title (for reference during new workout)
router.get('/latest', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const title = (req.query.title as string) || '';
    if (!title) {
      res.json(null);
      return;
    }
    const workout = await WorkoutService.getLatestByTitle(req.user!.keycloakId, title);
    if (!workout) {
      res.json(null);
      return;
    }
    res.json(toWorkoutResponse(workout));
  } catch (err) {
    next(err);
  }
});

// Get single workout
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workout = await WorkoutService.getById(req.user!.keycloakId, req.params.id);
    res.json(toWorkoutResponse(workout));
  } catch (err) {
    next(err);
  }
});

// Update workout
router.put('/:id', validateBody(updateWorkoutSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workout = await WorkoutService.update(req.user!.keycloakId, req.params.id, req.body);
    res.json(toWorkoutResponse(workout));
  } catch (err) {
    next(err);
  }
});

// Delete workout
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await WorkoutService.delete(req.user!.keycloakId, req.params.id);
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
