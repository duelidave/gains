import { IWorkout, IExercise, ISet } from '../models/Workout';

// ── Response DTOs ───────────────────────────────────────────────────────

export interface SetResponse {
  reps: number;
  weight: number;
  unit?: string;
  repsDisplay?: string;
  weight_kg?: number | number[];
  type?: string;
  duration?: number;
  duration_minutes?: number;
  duration_seconds?: number;
  distance?: number;
  distanceUnit?: string;
  notes?: string;
}

export interface ExerciseResponse {
  name: string;
  category?: string;
  bodyweight?: boolean;
  weight_unit?: string;
  rest_seconds?: number | null;
  notes?: string | null;
  sets: SetResponse[];
}

export interface WorkoutResponse {
  _id: string;
  userId: string;
  title: string;
  date: string;
  notes: string;
  exercises: ExerciseResponse[];
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutListResponse {
  data: WorkoutResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Internal list result (matches WorkoutService.list return type) ───────

interface ListResult {
  data: IWorkout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Mapper functions ────────────────────────────────────────────────────

function toSetResponse(set: ISet): SetResponse {
  const mapped: SetResponse = {
    reps: set.reps,
    weight: set.weight,
  };

  if (set.unit !== undefined) mapped.unit = set.unit;
  if (set.repsDisplay !== undefined) mapped.repsDisplay = set.repsDisplay;
  if (set.weight_kg !== undefined) mapped.weight_kg = set.weight_kg;
  if (set.type !== undefined) mapped.type = set.type;
  if (set.duration !== undefined) mapped.duration = set.duration;
  if (set.duration_minutes !== undefined) mapped.duration_minutes = set.duration_minutes;
  if (set.duration_seconds !== undefined) mapped.duration_seconds = set.duration_seconds;
  if (set.distance !== undefined) mapped.distance = set.distance;
  if (set.distanceUnit !== undefined) mapped.distanceUnit = set.distanceUnit;
  if (set.notes !== undefined) mapped.notes = set.notes;

  return mapped;
}

function toExerciseResponse(exercise: IExercise): ExerciseResponse {
  const mapped: ExerciseResponse = {
    name: exercise.name,
    sets: exercise.sets.map(toSetResponse),
  };

  if (exercise.category !== undefined) mapped.category = exercise.category;
  if (exercise.bodyweight !== undefined) mapped.bodyweight = exercise.bodyweight;
  if (exercise.weight_unit !== undefined) mapped.weight_unit = exercise.weight_unit;
  if (exercise.rest_seconds !== undefined) mapped.rest_seconds = exercise.rest_seconds;
  if (exercise.notes !== undefined) mapped.notes = exercise.notes;

  return mapped;
}

export function toWorkoutResponse(workout: IWorkout): WorkoutResponse {
  return {
    _id: workout._id.toString(),
    userId: workout.userId,
    title: workout.title,
    date: workout.date instanceof Date ? workout.date.toISOString() : String(workout.date),
    notes: workout.notes,
    exercises: workout.exercises.map(toExerciseResponse),
    duration: workout.duration,
    createdAt:
      workout.createdAt instanceof Date
        ? workout.createdAt.toISOString()
        : String(workout.createdAt),
    updatedAt:
      workout.updatedAt instanceof Date
        ? workout.updatedAt.toISOString()
        : String(workout.updatedAt),
  };
}

export function toWorkoutListResponse(result: ListResult): WorkoutListResponse {
  return {
    data: result.data.map(toWorkoutResponse),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}
