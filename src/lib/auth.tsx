import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { backendConfigured } from "./backend";

type AuthState = {
  /** `loading` until the persisted session has been read once. */
  status: "loading" | "signed_out" | "signed_in";
  session: Session | null;
  user: User | null;
};

type AuthApi = AuthState & {
  signUp(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ needsConfirmation: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

function appUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", session: null, user: null });

  useEffect(() => {
    if (!backendConfigured) {
      setState({ status: "signed_out", session: null, user: null });
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        status: data.session ? "signed_in" : "signed_out",
        session: data.session,
        user: data.session?.user ?? null,
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        status: session ? "signed_in" : "signed_out",
        session,
        user: session?.user ?? null,
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      ...state,
      async signUp({ email, password, fullName }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: appUrl("/app/login") },
        });
        if (error) throw error;
        // With "confirm email" enabled Supabase returns a user but no session.
        return { needsConfirmation: !data.session };
      },
      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: appUrl("/app/reset"),
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
