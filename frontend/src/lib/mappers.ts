import type { ApiSet, ApiExercise } from '../types';

// UI-friendly types used by components
export interface DisplaySet {
  reps: number;
  weight: number;
  unit: string;
  isDropset: boolean;
  repsDisplay?: string;
  durationSeconds?: number;  // unified duration in seconds
  distance?: number;
  distanceUnit?: string;
}

export interface DisplayExercise {
  name: string;
  category: 'strength' | 'cardio' | 'bodyweight';
  sets: DisplaySet[];
  isBodyweight: boolean;
  weightUnit?: string;
  restSeconds?: number;
  notes?: string;
}

// Map API set to display set
export function toDisplaySet(set: ApiSet): DisplaySet {
  // Unify duration: prefer set.duration, fallback to duration_minutes * 60 + duration_seconds
  let durationSeconds: number | undefined;
  if (set.duration != null) {
    durationSeconds = set.duration;
  } else if (set.duration_minutes != null || set.duration_seconds != null) {
    durationSeconds = (set.duration_minutes || 0) * 60 + (set.duration_seconds || 0);
  }

  return {
    reps: set.reps || 0,
    weight: set.weight || 0,
    unit: set.unit || 'kg',
    isDropset: set.type === 'dropset',
    repsDisplay: set.repsDisplay,
    durationSeconds,
    distance: set.distance,
    distanceUnit: set.distanceUnit,
  };
}

// Detect which columns to show based on actual set data
export interface ExerciseColumns {
  showReps: boolean;
  showWeight: boolean;
  showDuration: boolean;
  showDistance: boolean;
}

export function detectColumns(sets: DisplaySet[]): ExerciseColumns {
  return {
    showReps: sets.some(s => s.reps > 0),
    showWeight: sets.some(s => s.weight > 0),
    showDuration: sets.some(s => (s.durationSeconds ?? 0) > 0),
    showDistance: sets.some(s => (s.distance ?? 0) > 0),
  };
}

// Map API exercise to display exercise
export function toDisplayExercise(exercise: ApiExercise): DisplayExercise {
  const category = (exercise.category || 'strength') as 'strength' | 'cardio' | 'bodyweight';
  return {
    name: exercise.name,
    category,
    sets: exercise.sets.map(toDisplaySet),
    isBodyweight: exercise.bodyweight || category === 'bodyweight',
    weightUnit: exercise.weight_unit,
    restSeconds: exercise.rest_seconds ?? undefined,
    notes: exercise.notes ?? undefined,
  };
}
