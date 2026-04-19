import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getDraft } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';

interface DraftState {
  hasDraft: boolean;
  refresh: () => Promise<void>;
}

const DraftContext = createContext<DraftState>({
  hasDraft: false,
  refresh: async () => {},
});

export function DraftProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const draft = await getDraft();
      setHasDraft(!!draft);
    } catch {
      setHasDraft(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setHasDraft(false);
      return;
    }
    refresh();
  }, [authenticated, refresh]);

  return (
    <DraftContext.Provider value={{ hasDraft, refresh }}>
      {children}
    </DraftContext.Provider>
  );
}

export function useDraft() {
  return useContext(DraftContext);
}
