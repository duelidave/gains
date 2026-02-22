import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { sendProblem } from '../middleware/errorHandler';
import { TrainingPlan } from '../models/TrainingPlan';
import { createPlanSchema, updatePlanSchema, validateBody } from '../validation/schemas';

const router = Router();

// GET / — all plans for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await TrainingPlan.find({ userId: req.user!.keycloakId }).sort({ name: 1 });
    res.json(plans);
  } catch (err) {
    console.error('Error fetching plans:', err);
    sendProblem(res, 500, 'Failed to fetch plans', req.originalUrl);
  }
});

// GET /:id — single plan
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TrainingPlan.findOne({ _id: req.params.id, userId: req.user!.keycloakId });
    if (!plan) {
      sendProblem(res, 404, 'Plan not found', req.originalUrl);
      return;
    }
    res.json(plan);
  } catch (err) {
    console.error('Error fetching plan:', err);
    sendProblem(res, 500, 'Failed to fetch plan', req.originalUrl);
  }
});

// POST / — create plan
router.post('/', validateBody(createPlanSchema), async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TrainingPlan.create({
      ...req.body,
      userId: req.user!.keycloakId,
    });
    res.status(201).json(plan);
  } catch (err) {
    console.error('Error creating plan:', err);
    sendProblem(res, 500, 'Failed to create plan', req.originalUrl);
  }
});

// PUT /:id — update plan
router.put('/:id', validateBody(updatePlanSchema), async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TrainingPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.keycloakId },
      req.body,
      { new: true },
    );
    if (!plan) {
      sendProblem(res, 404, 'Plan not found', req.originalUrl);
      return;
    }
    res.json(plan);
  } catch (err) {
    console.error('Error updating plan:', err);
    sendProblem(res, 500, 'Failed to update plan', req.originalUrl);
  }
});

// DELETE /:id — delete plan
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const plan = await TrainingPlan.findOneAndDelete({ _id: req.params.id, userId: req.user!.keycloakId });
    if (!plan) {
      sendProblem(res, 404, 'Plan not found', req.originalUrl);
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting plan:', err);
    sendProblem(res, 500, 'Failed to delete plan', req.originalUrl);
  }
});

export default router;
