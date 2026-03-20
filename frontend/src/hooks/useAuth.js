import { create } from 'zustand';
import { supabase } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user || null, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

// ── Auth hook ─────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { user, session, loading, setSession, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  return { user, loading };
}
