import mongoose, { Schema, Document } from 'mongoose';

export interface IPlanExercise {
  name: string;
  setsReps: string;
  rest?: string;
  notes?: string;
}

export interface IPlanSection {
  name: string;
  duration?: string;
  exercises: IPlanExercise[];
}

export interface ITrainingPlan extends Document {
  userId: string;
  name: string;
  workoutTitle: string;
  sections: IPlanSection[];
  progressionNotes?: string;
}

const planExerciseSchema = new Schema<IPlanExercise>(
  {
    name: { type: String, required: true },
    setsReps: { type: String, required: true },
    rest: { type: String },
    notes: { type: String },
  },
  { _id: false },
);

const planSectionSchema = new Schema<IPlanSection>(
  {
    name: { type: String, required: true },
    duration: { type: String },
    exercises: { type: [planExerciseSchema], default: [] },
  },
  { _id: false },
);

const trainingPlanSchema = new Schema<ITrainingPlan>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    workoutTitle: { type: String, required: true },
    sections: { type: [planSectionSchema], default: [] },
    progressionNotes: { type: String },
  },
  { timestamps: true },
);

export const TrainingPlan = mongoose.model<ITrainingPlan>('TrainingPlan', trainingPlanSchema);
