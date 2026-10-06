import { Platform } from "react-native";

/*
 * NAVI 백엔드 API 공통 요청
 *
 * EXPO_PUBLIC_API_URL 이 없으면 로컬 서버를 사용합니다.
 * - Android 에뮬레이터 : 10.0.2.2 가 PC의 localhost
 * - 실제 기기 : .env 에 PC의 IP를 넣어주세요. (예: http://192.168.0.10:8080)
 */
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ??
    (Platform.OS === "android"
        ? "http://10.0.2.2:8080"
        : "http://localhost:8080");

/*
 * 백엔드 ErrorCode 와 동일
 */
export type ApiErrorCode =
    | "INVALID_INPUT"
    | "INTERNAL_ERROR"
    | "UNAUTHORIZED"
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_VERIFIED"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "INVALID_REFRESH_TOKEN"
    | "SESSION_REVOKED"
    | "EMAIL_ALREADY_EXISTS"
    | "MEMBER_NOT_FOUND"
    | "MEMBER_NOT_ACTIVE"
    | "NETWORK_ERROR";

type ApiResponseBody<T> = {
    success: boolean;
    data: T;
    error: {
        code: ApiErrorCode;
        message: string;
    } | null;
};

export class ApiError extends Error {
    constructor(
        readonly code: ApiErrorCode,
        message: string,
        readonly status: number
    ) {
        super(message);
        this.name = "ApiError";
    }
}

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    accessToken?: string;
};

export async function apiRequest<T>(
    path: string,
    { method = "GET", body, accessToken }: RequestOptions = {}
): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(accessToken
                    ? { Authorization: `Bearer ${accessToken}` }
                    : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(
            "NETWORK_ERROR",
            "네트워크 상태를 확인한 후 다시 시도해주세요.",
            0
        );
    }

    let json: ApiResponseBody<T> | null = null;

    try {
        json = await response.json();
    } catch {
        json = null;
    }

    if (!response.ok || !json?.success) {
        throw new ApiError(
            json?.error?.code ?? "INTERNAL_ERROR",
            json?.error?.message ?? "잠시 후 다시 시도해 주세요.",
            response.status
        );
    }

    return json.data;
}
