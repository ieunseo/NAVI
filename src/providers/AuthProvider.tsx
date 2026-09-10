import { createContext, useEffect, useState, type ReactNode } from "react";
import { watchAppState } from "@/lib/watch-app-state";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthValue = {
    session: Session | null;
    loading: boolean;
};
export const AuthContext = createContext<AuthValue>({
    session: null,
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(watchAppState, []);

    useEffect(() => {
        // INITIAL_SESSION이 저장된 세션을 알려주고, 이후 로그인/로그아웃도 알려줍니다.
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setLoading(false);
        });
        return () => data.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
