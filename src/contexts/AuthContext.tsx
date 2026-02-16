"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signOut = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const confirmSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowLogoutConfirm(false);
    window.location.href = "/login";
  }, [supabase.auth]);

  const cancelSignOut = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}

      {/* ログアウト確認ダイアログ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="pen-fade-in bg-card mx-4 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold">ログアウトしますか？</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              ログアウトすると、再度メール認証が必要になります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelSignOut}
                className="pen-btn pen-btn-secondary flex-1 py-2.5"
              >
                キャンセル
              </button>
              <button
                onClick={confirmSignOut}
                className="bg-danger text-danger-foreground flex-1 rounded-lg py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
