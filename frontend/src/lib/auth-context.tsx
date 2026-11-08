"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when running without Supabase, signed in as a local test user. */
  localMode: boolean;
  signInWithGoogle: () => Promise<string | null>;
  /** Signs in with an ID token from Google's own button. Returns an error message, or null. */
  signInWithGoogleIdToken: (idToken: string, nonce: string) => Promise<string | null>;
  /** Sends a magic sign-in link. Returns an error message, or null on success. */
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/** Test user used when Supabase isn't configured (local mode). */
const LOCAL_USER = {
  id: "local-dev-user",
  email: "local@thinkflow.test",
  app_metadata: {},
  user_metadata: { full_name: "Local User" },
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
} as unknown as User;

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  localMode: false,
  signInWithGoogle: async () => null,
  signInWithGoogleIdToken: async () => null,
  signInWithEmail: async () => null,
  signOut: async () => {},
});

function callbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const localMode = !isSupabaseConfigured;
  const [user, setUser] = useState<User | null>(localMode ? LOCAL_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!localMode);
  const supabase = useMemo(() => (localMode ? null : createClient()), [localMode]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setUser(LOCAL_USER);
      return null;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    return error ? error.message : null;
  }, [supabase]);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string, nonce: string) => {
      if (!supabase) return null;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce,
      });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) {
        setUser(LOCAL_USER);
        return null;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
      });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        localMode,
        signInWithGoogle,
        signInWithGoogleIdToken,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
