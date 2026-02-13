import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { updateSettingsSchema, validateBody } from '../validation/schemas';
import { toUserProfileResponse } from '../mappers';

const router = Router();

router.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(toUserProfileResponse(req.dbUser!));
  } catch (err) {
    next(err);
  }
});

router.put('/settings', validateBody(updateSettingsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.dbUser!;
    const { weightUnit, distanceUnit, darkMode, language } = req.body;
    const updates: Record<string, unknown> = {};
    if (weightUnit !== undefined) updates.weightUnit = weightUnit;
    if (distanceUnit !== undefined) updates.distanceUnit = distanceUnit;
    if (darkMode !== undefined) updates.darkMode = darkMode;
    if (language !== undefined) updates.language = language;

    user.settings = { ...(user.settings as Record<string, unknown>), ...updates };
    await user.save();
    res.json(toUserProfileResponse(user));
  } catch (err) {
    next(err);
  }
});

export default router;
