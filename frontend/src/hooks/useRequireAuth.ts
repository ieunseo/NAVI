import { useCallback, useState } from "react";
import { router } from "expo-router";

import { useAuth } from "./useAuth";

export function useRequireAuth() {
    const { session } = useAuth();

    const [
        loginRequiredVisible,
        setLoginRequiredVisible,
    ] = useState(false);

    /*
     * 회원 전용 기능 접근 여부를 확인합니다.
     *
     * 로그인 상태
     * → 전달받은 기능 실행
     *
     * 비로그인 상태
     * → NAVI 로그인 안내 모달 표시
     */
    const requireAuth = useCallback(
        (onAuthenticated: () => void) => {
            if (session) {
                onAuthenticated();
                return;
            }

            setLoginRequiredVisible(true);
        },
        [session]
    );

    /*
     * 로그인 안내 모달 닫기
     */
    const closeLoginRequired = useCallback(() => {
        setLoginRequiredVisible(false);
    }, []);

    /*
     * 로그인 안내 모달에서
     * 로그인 버튼을 선택한 경우
     */
    const goToLogin = useCallback(() => {
        setLoginRequiredVisible(false);

        router.push("/auth/login");
    }, []);

    return {
        requireAuth,
        loginRequiredVisible,
        closeLoginRequired,
        goToLogin,
    };
}