import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { ApiError, apiRequest } from "./api";
import { getDeviceInfo } from "./device";

/*
 * =====================================================
 * 타입 (백엔드 응답과 동일)
 * =====================================================
 */

export type AuthUser = {
    id: string;
    email: string | null;
    nickname: string | null;
};

type MemberResponse = AuthUser & {
    status: "ACTIVE" | "WITHDRAWN" | "SUSPENDED";
};

type TokenResponse = {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
};

type LoginResponse = {
    token: TokenResponse;
    member: MemberResponse;
};

export type Session = TokenResponse & {
    user: AuthUser;
};

/*
 * 로그아웃된 이유
 * - USER          : 사용자가 직접 로그아웃
 * - REPLACED      : 다른 기기에서 로그인 (1세션 1로그인)
 * - EXPIRED       : 토큰 만료 등으로 다시 로그인 필요
 */
export type SignOutReason = "USER" | "REPLACED" | "EXPIRED";

type Listener = (
    session: Session | null,
    reason?: SignOutReason
) => void;

/*
 * =====================================================
 * 저장소
 *
 * 네이티브 : SecureStore (Keychain / Keystore)
 * 웹       : AsyncStorage (localStorage)
 * =====================================================
 */

const SESSION_KEY = "navi.session";

const storage = {
    get: (key: string) =>
        Platform.OS === "web"
            ? AsyncStorage.getItem(key)
            : SecureStore.getItemAsync(key),

    set: (key: string, value: string) =>
        Platform.OS === "web"
            ? AsyncStorage.setItem(key, value)
            : SecureStore.setItemAsync(key, value),

    remove: (key: string) =>
        Platform.OS === "web"
            ? AsyncStorage.removeItem(key)
            : SecureStore.deleteItemAsync(key),
};

/*
 * =====================================================
 * 현재 세션 (메모리)
 * =====================================================
 */

let currentSession: Session | null = null;

const listeners = new Set<Listener>();

export function getSession() {
    return currentSession;
}

export function subscribeSession(listener: Listener) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

async function saveSession(session: Session) {
    currentSession = session;

    await storage.set(
        SESSION_KEY,
        JSON.stringify(session)
    );

    listeners.forEach((listener) => listener(session));
}

export async function clearSession(reason: SignOutReason) {
    currentSession = null;

    await storage.remove(SESSION_KEY);

    listeners.forEach((listener) => listener(null, reason));
}

/*
 * 앱 시작 시 저장된 세션 복구
 * Refresh Token 까지 만료됐다면 버립니다.
 */
export async function loadStoredSession() {
    const stored = await storage.get(SESSION_KEY);

    if (!stored) {
        return null;
    }

    try {
        const session = JSON.parse(stored) as Session;

        if (
            new Date(session.refreshTokenExpiresAt).getTime() <=
            Date.now()
        ) {
            await storage.remove(SESSION_KEY);
            return null;
        }

        currentSession = session;
        return session;
    } catch {
        await storage.remove(SESSION_KEY);
        return null;
    }
}

function toSession(response: LoginResponse): Session {
    return {
        ...response.token,
        user: {
            id: response.member.id,
            email: response.member.email,
            nickname: response.member.nickname,
        },
    };
}

/*
 * 인증이 끊긴 응답이면 세션을 비웁니다.
 */
async function handleAuthError(error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 401) {
        return;
    }

    await clearSession(
        error.code === "SESSION_REVOKED"
            ? "REPLACED"
            : "EXPIRED"
    );
}

/*
 * =====================================================
 * 인증 API
 * =====================================================
 */

/*
 * 회원가입
 *
 * 가입하면 인증 메일이 발송되고,
 * 메일의 링크로 인증을 마친 뒤에 로그인할 수 있습니다.
 */
export async function signUpWithEmail(params: {
    email: string;
    password: string;
    nickname: string;
}) {
    return apiRequest<{ email: string }>(
        "/api/auth/signup",
        {
            method: "POST",
            body: params,
        }
    );
}

/*
 * 인증 메일 다시 보내기
 * (가입 여부와 상관없이 서버는 항상 성공으로 응답합니다.)
 */
export async function resendVerificationEmail(email: string) {
    await apiRequest<void>(
        "/api/auth/verify-email/resend",
        {
            method: "POST",
            body: { email },
        }
    );
}

export async function signInWithEmail(params: {
    email: string;
    password: string;
}) {
    const response = await apiRequest<LoginResponse>(
        "/api/auth/login",
        {
            method: "POST",
            body: {
                ...params,
                device: await getDeviceInfo(),
            },
        }
    );

    const session = toSession(response);
    await saveSession(session);
    return session;
}

/*
 * 서버 요청이 실패해도 기기에서는 로그아웃합니다.
 */
export async function signOut() {
    const session = currentSession;

    try {
        if (session) {
            await apiRequest<void>("/api/auth/logout", {
                method: "POST",
                accessToken: session.accessToken,
            });
        }
    } catch (error) {
        console.error("logout error:", error);
    } finally {
        await clearSession("USER");
    }
}

/*
 * Access Token 재발급
 *
 * 여러 요청이 동시에 만료돼도 재발급은 한 번만 합니다.
 * (Refresh Token 이 매번 교체되므로 동시에 두 번 요청하면 하나는 실패합니다.)
 */
let refreshPromise: Promise<Session> | null = null;

export function refreshSession() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const session = currentSession;

        if (!session) {
            throw new ApiError(
                "UNAUTHORIZED",
                "로그인이 필요해요.",
                401
            );
        }

        try {
            const token = await apiRequest<TokenResponse>(
                "/api/auth/refresh",
                {
                    method: "POST",
                    body: {
                        refreshToken: session.refreshToken,
                    },
                }
            );

            const nextSession: Session = {
                ...token,
                user: session.user,
            };

            await saveSession(nextSession);
            return nextSession;
        } catch (error) {
            await handleAuthError(error);
            throw error;
        }
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

/*
 * 로그인이 필요한 API 요청
 *
 * Access Token 이 만료됐으면 재발급 후 한 번 다시 요청합니다.
 */
export async function authRequest<T>(
    path: string,
    options: Omit<Parameters<typeof apiRequest>[1], "accessToken"> = {}
): Promise<T> {
    const session = currentSession;

    if (!session) {
        throw new ApiError(
            "UNAUTHORIZED",
            "로그인이 필요해요.",
            401
        );
    }

    try {
        return await apiRequest<T>(path, {
            ...options,
            accessToken: session.accessToken,
        });
    } catch (error) {
        if (
            error instanceof ApiError &&
            error.code === "TOKEN_EXPIRED"
        ) {
            const nextSession = await refreshSession();

            try {
                return await apiRequest<T>(path, {
                    ...options,
                    accessToken: nextSession.accessToken,
                });
            } catch (retryError) {
                await handleAuthError(retryError);
                throw retryError;
            }
        }

        await handleAuthError(error);
        throw error;
    }
}

/*
 * 내 정보 다시 불러오기 (닉네임 변경 등 반영)
 */
export async function fetchMe() {
    const member = await authRequest<MemberResponse>(
        "/api/members/me"
    );

    const session = currentSession;

    if (session) {
        await saveSession({
            ...session,
            user: {
                id: member.id,
                email: member.email,
                nickname: member.nickname,
            },
        });
    }

    return member;
}
