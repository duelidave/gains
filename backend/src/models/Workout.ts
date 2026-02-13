import mongoose, { Schema, Document } from 'mongoose';

export interface ISet {
  reps: number;
  repsDisplay?: string;           // Original format for dropsets, e.g. "6+5"
  weight: number;                 // Numeric weight (backward compat; max for dropsets)
  weight_kg?: number | number[];  // Original weight_kg (array for dropsets)
  type?: string;                  // e.g. "dropset"
  duration_minutes?: number;      // For cardio exercises
  duration_seconds?: number;      // For timed exercises (e.g. plank)
  notes?: string;
  unit?: string;                  // e.g. "kg" (from AI parse)
  duration?: number;              // Duration in seconds (from AI parse)
  distance?: number;              // Distance (from AI parse)
  distanceUnit?: string;          // e.g. "km" (from AI parse)
}

export interface IExercise {
  name: string;
  sets: ISet[];
  bodyweight?: boolean;
  weight_unit?: string;           // "per_hand" | "per_side"
  weight_kg?: number | null;      // Default weight at exercise level
  rest_seconds?: number | null;
  notes?: string | null;
  category?: string;              // "strength" | "cardio" | "bodyweight"
}

export interface IWorkout extends Document {
  userId: string;
  date: Date;
  title: string;
  notes: string;
  exercises: IExercise[];
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const setSchema = new Schema(
  {
    reps: { type: Number, default: 0 },
    repsDisplay: { type: String },
    weight: { type: Number, default: 0 },
    weight_kg: { type: Schema.Types.Mixed },
    type: { type: String },
    duration_minutes: { type: Number },
    duration_seconds: { type: Number },
    notes: { type: String },
    unit: { type: String },
    duration: { type: Number },
    distance: { type: Number },
    distanceUnit: { type: String },
  },
  { _id: false }
);

const exerciseSchema = new Schema(
  {
    name: { type: String, required: true },
    sets: { type: [setSchema], default: [] },
    bodyweight: { type: Boolean },
    weight_unit: { type: String },
    weight_kg: { type: Schema.Types.Mixed },
    rest_seconds: { type: Number },
    notes: { type: String },
    category: { type: String },
  },
  { _id: false }
);

const workoutSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    title: { type: String, required: true },
    notes: { type: String, default: '' },
    exercises: { type: [exerciseSchema], default: [] },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

workoutSchema.index({ userId: 1, date: -1 });

export const Workout = mongoose.model<IWorkout>('Workout', workoutSchema);
