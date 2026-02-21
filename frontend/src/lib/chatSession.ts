export const CHAT_SESSION_KEY = 'gains-workout-chat';

export function hasChatSession(): boolean {
  try {
    return sessionStorage.getItem(CHAT_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}
