import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendProblem } from '../middleware/errorHandler';

// ---------- Set schema ----------

const setSchema = z.object({
  reps: z.number().int().min(0).optional().default(0),
  repsDisplay: z.string().optional(),
  weight: z.number().min(0).optional().default(0),
  weight_kg: z.union([z.number(), z.array(z.number()), z.null()]).optional(),
  type: z.string().optional(),
  duration_minutes: z.number().min(0).optional(),
  duration_seconds: z.number().min(0).optional(),
  notes: z.string().optional(),
  unit: z.string().optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  distanceUnit: z.string().optional(),
});

// ---------- Exercise schema ----------

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.array(setSchema).default([]),
  bodyweight: z.boolean().optional(),
  weight_unit: z.string().optional(),
  weight_kg: z.union([z.number(), z.null()]).optional(),
  rest_seconds: z.union([z.number(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  category: z.string().optional(),
});

// ---------- Workout schemas ----------

export const createWorkoutSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().optional(),
  notes: z.string().optional().default(''),
  exercises: z.array(exerciseSchema).default([]),
  duration: z.number().min(0).optional().default(0),
});

export const updateWorkoutSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
  duration: z.number().min(0).optional(),
});

// ---------- Settings schema ----------

export const updateSettingsSchema = z.object({
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  distanceUnit: z.enum(['km', 'mi']).optional(),
  darkMode: z.boolean().optional(),
  language: z.enum(['en', 'de']).optional(),
});

// ---------- Parse request schema ----------

export const parseRequestSchema = z.object({
  messages: z.array(z.string().min(1).max(1000)).min(1, 'messages must be a non-empty array of strings').max(50),
});

// ---------- Validation middleware factory ----------

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      sendProblem(res, 400, detail, req.originalUrl);
      return;
    }
    req.body = result.data;
    next();
  };
}
