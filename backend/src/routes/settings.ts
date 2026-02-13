import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { updateSettingsSchema, validateBody } from '../validation/schemas';
import { toUserSettingsResponse } from '../mappers';

const router = Router();

const defaultSettings = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  darkMode: true,
  language: 'en',
};

// GET /api/settings
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = toUserSettingsResponse(
      { ...defaultSettings, ...(req.dbUser!.settings as Record<string, unknown>) },
    );
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', validateBody(updateSettingsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.dbUser!;
    const { weightUnit, distanceUnit, darkMode, language } = req.body;
    const updates: Record<string, unknown> = {};
    if (weightUnit !== undefined) updates.weightUnit = weightUnit;
    if (distanceUnit !== undefined) updates.distanceUnit = distanceUnit;
    if (darkMode !== undefined) updates.darkMode = darkMode;
    if (language !== undefined) updates.language = language;

    user.settings = { ...defaultSettings, ...(user.settings as Record<string, unknown>), ...updates };
    await user.save();
    res.json(toUserSettingsResponse(user.settings as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

export default router;
