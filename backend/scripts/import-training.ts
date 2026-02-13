import mongoose from 'mongoose';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secret@localhost:27017/fitness?authSource=admin';
const KEYCLOAK_ID = process.argv[2] || process.env.KEYCLOAK_ID || '';
const EXPORT_FILE = process.argv[3] || process.env.EXPORT_FILE || resolve(process.cwd(), 'training-export.json');

if (!KEYCLOAK_ID) {
  console.error('Usage: ts-node scripts/import-training.ts <keycloak-id> [export-file-path]');
  console.error('  or set KEYCLOAK_ID and optionally EXPORT_FILE env vars');
  console.error('  Default export file: ./training-export.json (in CWD)');
  process.exit(1);
}

if (!existsSync(EXPORT_FILE)) {
  console.error(`Export file not found: ${EXPORT_FILE}`);
  console.error('Pass the path as the second argument or set EXPORT_FILE env var');
  process.exit(1);
}

// ---------- Types matching training-export.json structure ----------

interface ExportSet {
  reps?: number | string;
  weight_kg?: number | number[];
  type?: string;
  duration_minutes?: number;
  duration_seconds?: number;
  notes?: string;
}

interface ExportExercise {
  name: string;
  weight_kg: number | null;
  bodyweight?: boolean;
  weight_unit?: string;
  sets: ExportSet[];
  rest_seconds: number | null;
  notes: string | null;
}

interface ExportSession {
  date: string;
  type: string;
  notes: string | null;
  exercises: ExportExercise[];
}

interface ExportData {
  export_date: string;
  sessions: ExportSession[];
}

// ---------- Transform helpers ----------

function parseRepsTotal(reps: number | string | undefined): number {
  if (reps == null) return 0;
  if (typeof reps === 'number') return reps;
  // "6+5" → 11, "5+2+4" → 11
  return reps.split('+').reduce((sum, part) => sum + (parseInt(part, 10) || 0), 0);
}

function getNumericWeight(weightKg: number | number[] | undefined | null): number {
  if (weightKg == null) return 0;
  if (Array.isArray(weightKg)) return weightKg.length > 0 ? Math.max(...weightKg) : 0;
  return weightKg;
}

function capitalizeType(type: string): string {
  return type
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function detectCategory(exercise: ExportExercise): string {
  const hasDuration = exercise.sets.some(
    (s) => s.duration_minutes != null || s.duration_seconds != null
  );
  if (hasDuration) return 'cardio';
  if (exercise.bodyweight) return 'bodyweight';
  return 'strength';
}

// ---------- Transform session → workout document ----------

function transformSession(session: ExportSession, userId: string) {
  const exercises = session.exercises.map((ex) => {
    const category = detectCategory(ex);

    const sets = ex.sets.map((s) => {
      // Resolve weight_kg: set-level overrides exercise-level
      const setWeightKg = s.weight_kg != null ? s.weight_kg : ex.weight_kg;

      const set: Record<string, unknown> = {};

      // reps: always store numeric reps; keep original string in repsDisplay
      if (s.reps != null) {
        if (typeof s.reps === 'string') {
          set.reps = parseRepsTotal(s.reps);
          set.repsDisplay = s.reps;
        } else {
          set.reps = s.reps;
        }
      } else {
        set.reps = 0;
      }

      // weight: store weight_kg (original) and weight (numeric, for backward compat)
      set.weight_kg = setWeightKg;
      set.weight = getNumericWeight(setWeightKg);

      // Optional fields
      if (s.type) set.type = s.type;
      if (s.duration_minutes != null) set.duration_minutes = s.duration_minutes;
      if (s.duration_seconds != null) set.duration_seconds = s.duration_seconds;
      if (s.notes) set.notes = s.notes;

      return set;
    });

    const exercise: Record<string, unknown> = {
      name: ex.name,
      sets,
      category,
    };

    if (ex.bodyweight) exercise.bodyweight = true;
    if (ex.weight_unit) exercise.weight_unit = ex.weight_unit;
    if (ex.weight_kg != null) exercise.weight_kg = ex.weight_kg;
    if (ex.rest_seconds != null) exercise.rest_seconds = ex.rest_seconds;
    if (ex.notes) exercise.notes = ex.notes;

    return exercise;
  });

  // Calculate total duration from cardio/timed sets
  let duration = 0;
  for (const ex of exercises) {
    if (Array.isArray(ex.sets)) {
      for (const s of ex.sets as Record<string, unknown>[]) {
        if (typeof s.duration_minutes === 'number') duration += s.duration_minutes;
        if (typeof s.duration_seconds === 'number') duration += s.duration_seconds / 60;
      }
    }
  }

  return {
    userId,
    date: new Date(session.date),
    title: capitalizeType(session.type),
    notes: session.notes || '',
    exercises,
    duration: Math.round(duration),
  };
}

// ---------- Main ----------

async function importData() {
  const raw = readFileSync(EXPORT_FILE, 'utf-8');
  const data: ExportData = JSON.parse(raw);

  console.log(`Loaded ${data.sessions.length} sessions from ${EXPORT_FILE}`);
  console.log(`Target user: ${KEYCLOAK_ID}`);

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Use a loose model (same pattern as seed.ts) to avoid schema conflicts
  const Workout = mongoose.model(
    'Workout',
    new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'workouts' })
  );

  let imported = 0;
  let skipped = 0;

  for (const session of data.sessions) {
    const title = capitalizeType(session.type);
    const date = new Date(session.date);

    // Duplicate check: same user + title + same day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await Workout.findOne({
      userId: KEYCLOAK_ID,
      title,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (existing) {
      console.log(`  Skipped (duplicate): ${title} on ${session.date}`);
      skipped++;
      continue;
    }

    const workout = transformSession(session, KEYCLOAK_ID);
    await Workout.create(workout);

    const exerciseCount = workout.exercises.length;
    const setCount = workout.exercises.reduce(
      (sum, ex) => sum + (Array.isArray(ex.sets) ? (ex.sets as unknown[]).length : 0),
      0
    );
    console.log(`  Imported: ${title} on ${session.date} (${exerciseCount} exercises, ${setCount} sets)`);
    imported++;
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped (duplicates)`);
  await mongoose.disconnect();
}

importData().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
