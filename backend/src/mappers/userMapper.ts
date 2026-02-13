import { IUser } from '../models/User';

// ── Response DTOs ───────────────────────────────────────────────────────

export interface UserSettingsResponse {
  weightUnit: string;
  distanceUnit: string;
  darkMode: boolean;
  language: string;
}

export interface UserProfileResponse {
  id: string;
  displayName: string;
  email: string;
  settings: UserSettingsResponse;
  createdAt: string;
}

// ── Default settings (fallback for missing fields) ──────────────────────

const DEFAULT_SETTINGS: UserSettingsResponse = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  darkMode: true,
  language: 'en',
};

// ── Mapper functions ────────────────────────────────────────────────────

export function toUserSettingsResponse(
  settings: Record<string, unknown>,
): UserSettingsResponse {
  return {
    weightUnit: (settings.weightUnit as string) ?? DEFAULT_SETTINGS.weightUnit,
    distanceUnit: (settings.distanceUnit as string) ?? DEFAULT_SETTINGS.distanceUnit,
    darkMode: (settings.darkMode as boolean) ?? DEFAULT_SETTINGS.darkMode,
    language: (settings.language as string) ?? DEFAULT_SETTINGS.language,
  };
}

export function toUserProfileResponse(user: IUser): UserProfileResponse {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    settings: toUserSettingsResponse(
      (user.settings as Record<string, unknown>) || {},
    ),
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : String(user.createdAt),
  };
}
