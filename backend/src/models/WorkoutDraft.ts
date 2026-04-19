import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkoutDraft extends Document {
  userId: string;
  state: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const workoutDraftSchema = new Schema<IWorkoutDraft>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    state: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const WorkoutDraft = mongoose.model<IWorkoutDraft>('WorkoutDraft', workoutDraftSchema);
