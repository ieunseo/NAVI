import {
    createContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { watchAppState } from "../lib/watch-app-state";

type AuthValue = {
    session: Session | null;
    loading: boolean;
    error: string | null;
    retry: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue>({
    session: null,
    loading: true,
    error: null,
    retry: async () => {},
});

export function AuthProvider({
                                 children,
                             }: {
    children: ReactNode;
}) {
    const [session, setSession] =
        useState<Session | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    /*
     * 저장된 Supabase Session 복구
     *
     * 앱 최초 실행 / 재실행 시
     * 현재 로그인 상태를 확인합니다.
     */
    const initializeSession = useCallback(
        async () => {
            setLoading(true);
            setError(null);

            try {
                const {
                    data: { session: initialSession },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                setSession(initialSession);
            } catch (error) {
                console.error(
                    "initialize auth session error:",
                    error
                );

                setSession(null);

                setError(
                    "네트워크 상태를 확인한 후 다시 시도해주세요."
                );
            } finally {
                setLoading(false);
            }
        },
        []
    );

    /*
     * 앱이 foreground / background로 이동할 때
     * Supabase 토큰 자동 갱신 상태를 관리합니다.
     */
    useEffect(watchAppState, []);

    /*
     * 앱 시작 시 저장된 Session을 복구하고
     * 이후 로그인 / 로그아웃 상태 변화를 감지합니다.
     */
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            setLoading(true);
            setError(null);

            try {
                const {
                    data: { session: initialSession },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                if (!mounted) {
                    return;
                }

                setSession(initialSession);
            } catch (error) {
                console.error(
                    "initialize auth session error:",
                    error
                );

                if (!mounted) {
                    return;
                }

                setSession(null);

                setError(
                    "네트워크 상태를 확인한 후 다시 시도해주세요."
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (!mounted) {
                    return;
                }

                setSession(nextSession);
                setError(null);
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    /*
     * 오류 화면의 "다시 시도" 버튼에서 사용합니다.
     */
    const retry = useCallback(async () => {
        await initializeSession();
    }, [initializeSession]);

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
                error,
                retry,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}