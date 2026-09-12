import {
    createContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { watchAppState } from "@/lib/watch-app-state";

type AuthValue = {
    session: Session | null;
    loading: boolean;
};

export const AuthContext = createContext<AuthValue>({
    session: null,
    loading: true,
});

export function AuthProvider({
                                 children,
                             }: {
    children: ReactNode;
}) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * 앱 foreground / background 상태에 맞춰
     * Supabase token auto refresh 관리
     */
    useEffect(watchAppState, []);

    /**
     * 앱 시작 시 저장되어 있는 기존 세션 불러오기
     */
    useEffect(() => {
        let mounted = true;

        const initializeSession = async () => {
            try {
                const {
                    data: { session: initialSession },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.error(
                        "get initial session error:",
                        error
                    );
                }

                if (mounted) {
                    setSession(initialSession);
                    setLoading(false);
                }
            } catch (error) {
                console.error(
                    "initialize auth session error:",
                    error
                );

                if (mounted) {
                    setSession(null);
                    setLoading(false);
                }
            }
        };

        initializeSession();

        /**
         * 로그인 / 로그아웃 / 토큰 갱신 / callback setSession 등을
         * 모두 여기서 감지한다.
         */
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (!mounted) {
                    return;
                }

                setSession(nextSession);
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}