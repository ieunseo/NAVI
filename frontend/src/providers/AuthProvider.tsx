import {
    createContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { Alert } from "react-native";

import { ApiError } from "../lib/api";
import {
    loadStoredSession,
    refreshSession,
    signInWithEmail,
    signOut as signOutSession,
    signUpWithEmail,
    subscribeSession,
    type Session,
} from "../lib/auth-session";

type AuthValue = {
    session: Session | null;
    loading: boolean;
    error: string | null;
    retry: () => Promise<void>;
    signIn: (params: {
        email: string;
        password: string;
    }) => Promise<Session>;
    signUp: (params: {
        email: string;
        password: string;
        nickname: string;
    }) => Promise<{ email: string }>;
    signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue>({
    session: null,
    loading: true,
    error: null,
    retry: async () => {},
    signIn: async () => {
        throw new Error("AuthProvider가 필요합니다.");
    },
    signUp: async () => {
        throw new Error("AuthProvider가 필요합니다.");
    },
    signOut: async () => {},
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
     * 저장된 Session 복구
     *
     * 앱 최초 실행 / 재실행 시
     * 저장된 토큰을 불러온 뒤 서버에서 재발급받아
     * 아직 유효한 로그인인지 확인합니다.
     *
     * 네트워크 오류일 때는 저장된 로그인 상태를 유지합니다.
     */
    const initializeSession = useCallback(
        async () => {
            setLoading(true);
            setError(null);

            try {
                const storedSession =
                    await loadStoredSession();

                setSession(storedSession);

                if (storedSession) {
                    await refreshSession();
                }
            } catch (error) {
                if (
                    error instanceof ApiError &&
                    error.code === "NETWORK_ERROR"
                ) {
                    return;
                }

                // 401 은 auth-session 에서 세션을 비우고 구독으로 반영됩니다.
                if (
                    !(error instanceof ApiError) ||
                    error.status !== 401
                ) {
                    console.error(
                        "initialize auth session error:",
                        error
                    );

                    setError(
                        "네트워크 상태를 확인한 후 다시 시도해주세요."
                    );
                }
            } finally {
                setLoading(false);
            }
        },
        []
    );

    /*
     * 앱 시작 시 저장된 Session을 복구하고
     * 이후 로그인 / 로그아웃 / 토큰 재발급을 감지합니다.
     */
    useEffect(() => {
        const unsubscribe = subscribeSession(
            (nextSession, reason) => {
                setSession(nextSession);
                setError(null);

                if (reason === "REPLACED") {
                    Alert.alert(
                        "로그아웃되었어요",
                        "다른 기기에서 로그인되어 로그아웃되었어요."
                    );
                }
            }
        );

        void initializeSession();

        return unsubscribe;
    }, [initializeSession]);

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
                signIn: signInWithEmail,
                signUp: signUpWithEmail,
                signOut: signOutSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
