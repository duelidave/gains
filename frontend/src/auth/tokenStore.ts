let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

export async function getToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  return tokenGetter();
}
