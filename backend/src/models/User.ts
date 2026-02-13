import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  keycloakId: string;
  displayName: string;
  email: string;
  passwordHash?: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    keycloakId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
