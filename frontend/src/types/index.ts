// API Response types (what comes from the backend)
export interface ApiSet {
  reps: number;
  weight: number;
  unit?: string;
  repsDisplay?: string;
  weight_kg?: number | number[];
  type?: string;           // "dropset"
  duration?: number;       // seconds (from AI parser)
  duration_minutes?: number; // from import
  duration_seconds?: number; // from import
  distance?: number;
  distanceUnit?: string;
  notes?: string;
}

export interface ApiExercise {
  name: string;
  category?: string;
  bodyweight?: boolean;
  weight_unit?: string;  // "per_hand" | "per_side"
  rest_seconds?: number | null;
  notes?: string | null;
  sets: ApiSet[];
}

export interface Workout {
  _id: string;
  userId: string;
  title: string;
  date: string;
  notes: string;
  exercises: ApiExercise[];
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutInput {
  title: string;
  date: string;
  notes?: string;
  exercises: ApiExercise[];
}

export interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  distanceUnit: 'km' | 'mi';
  darkMode: boolean;
  language: 'en' | 'de';
}

export interface StreakData {
  current: number;
  longest: number;
}

export interface WeeklyData {
  day: string;
  count: number;
}

export interface VolumeData {
  week: string;
  volume: number;
}

export interface TopExercise {
  name: string;
  count: number;
}

export interface ProgressPoint {
  date: string;
  value: number;
  isPR: boolean;
  e1rm?: number;
  isE1rmPR?: boolean;
  bestSet?: { reps: number; weight: number; setsCount: number } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
