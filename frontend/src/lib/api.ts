import { getToken } from '../auth/tokenStore';
import type {
  Workout,
  WorkoutInput,
  UserSettings,
  StreakData,
  WeeklyData,
  VolumeData,
  TopExercise,
  ProgressPoint,
  PaginatedResponse,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Workouts
export function getWorkouts(page = 1, limit = 10, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return request<PaginatedResponse<Workout>>(`/workouts?${params}`);
}

export function getWorkout(id: string) {
  return request<Workout>(`/workouts/${id}`);
}

export function createWorkout(data: WorkoutInput) {
  return request<Workout>('/workouts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateWorkout(id: string, data: WorkoutInput) {
  return request<Workout>(`/workouts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteWorkout(id: string) {
  return request<void>(`/workouts/${id}`, { method: 'DELETE' });
}

// Parse workout (chat)
export function parseWorkout(messages: string[]) {
  return request<WorkoutInput>('/workouts/parse', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

// Stats
export function getStreak() {
  return request<StreakData>('/stats/streak');
}

export function getWeeklyStats() {
  return request<WeeklyData[]>('/stats/weekly');
}

export function getVolumeStats() {
  return request<VolumeData[]>('/stats/volume');
}

export function getTopExercises() {
  return request<TopExercise[]>('/stats/top-exercises');
}

// Progress
export function getProgress(exercise: string, period: string) {
  const params = new URLSearchParams({ exercise, period });
  return request<ProgressPoint[]>(`/progress?${params}`);
}

// Exercises (autocomplete)
export function getExerciseNames() {
  return request<string[]>('/exercises');
}

// Settings
export function getSettings() {
  return request<UserSettings>('/settings');
}

export function updateSettings(data: Partial<UserSettings>) {
  return request<UserSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
