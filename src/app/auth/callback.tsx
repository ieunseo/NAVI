import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";

import { AppButton } from "@/components/ui/AppButton";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { supabase } from "@/lib/supabase";

type AuthParams = {
    code: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    error: string | null;
    errorDescription: string | null;
};

function parseAuthParams(url: string): AuthParams {
    const [urlWithoutHash, hashString = ""] = url.split("#");

    const queryString = urlWithoutHash.includes("?")
        ? urlWithoutHash.split("?")[1]
        : "";

    const queryParams = new URLSearchParams(queryString);
    const hashParams = new URLSearchParams(hashString);

    return {
        code:
            queryParams.get("code") ??
            hashParams.get("code"),

        accessToken:
            queryParams.get("access_token") ??
            hashParams.get("access_token"),

        refreshToken:
            queryParams.get("refresh_token") ??
            hashParams.get("refresh_token"),

        error:
            queryParams.get("error") ??
            hashParams.get("error") ??
            queryParams.get("error_code") ??
            hashParams.get("error_code"),

        errorDescription:
            queryParams.get("error_description") ??
            hashParams.get("error_description"),
    };
}

export default function AuthCallbackScreen() {
    const url = Linking.useLinkingURL();

    const handledUrlRef = useRef<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!url) {
            return;
        }

        if (handledUrlRef.current === url) {
            return;
        }

        handledUrlRef.current = url;

        const createSession = async () => {
            try {
                setLoading(true);
                setErrorMessage(null);

                const {
                    code,
                    accessToken,
                    refreshToken,
                    error,
                    errorDescription,
                } = parseAuthParams(url);

                // Supabase에서 인증 실패 정보가 넘어온 경우
                if (error) {
                    throw new Error(
                        errorDescription || "이메일 인증에 실패했어요."
                    );
                }

                /**
                 * PKCE 방식
                 *
                 * callback URL:
                 * navi://auth/callback?code=xxxx
                 */
                if (code) {
                    const { data, error: exchangeError } =
                        await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        throw exchangeError;
                    }

                    if (!data.session) {
                        throw new Error(
                            "인증은 완료되었지만 로그인 세션을 만들지 못했어요."
                        );
                    }

                    router.replace("/");
                    return;
                }

                /**
                 * Implicit 방식
                 *
                 * callback URL:
                 * navi://auth/callback#access_token=...&refresh_token=...
                 */
                if (accessToken && refreshToken) {
                    const { data, error: sessionError } =
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                    if (sessionError) {
                        throw sessionError;
                    }

                    if (!data.session) {
                        throw new Error(
                            "인증은 완료되었지만 로그인 세션을 만들지 못했어요."
                        );
                    }

                    router.replace("/");
                    return;
                }

                /**
                 * 이미 Supabase가 세션을 가지고 있는 경우도 확인
                 */
                const {
                    data: { session },
                    error: getSessionError,
                } = await supabase.auth.getSession();

                if (getSessionError) {
                    throw getSessionError;
                }

                if (session) {
                    router.replace("/");
                    return;
                }

                throw new Error(
                    "이메일 인증 정보를 확인할 수 없어요."
                );
            } catch (error) {
                console.error("auth callback error:", error);

                const message =
                    error instanceof Error
                        ? error.message
                        : "이메일 인증 처리 중 오류가 발생했어요.";

                setErrorMessage(message);
            } finally {
                setLoading(false);
            }
        };

        createSession();
    }, [url]);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" />

                    <Text style={styles.title}>
                        이메일 인증을 확인하고 있어요
                    </Text>

                    <Text style={styles.description}>
                        잠시만 기다려 주세요.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorMessage) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.title}>
                        인증을 완료하지 못했어요
                    </Text>

                    <Text style={styles.description}>
                        {errorMessage}
                    </Text>

                    <View style={styles.buttonArea}>
                        <AppButton
                            title="로그인 화면으로"
                            onPress={() => router.replace("/auth/login")}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.center}>
                <ActivityIndicator size="large" />

                <Text style={styles.title}>
                    로그인 중이에요
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    center: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },

    title: {
        ...Typography.title,
        color: Colors.textPrimary,
        textAlign: "center",
    },

    description: {
        marginTop: 16,
        ...Typography.subtitle,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    buttonArea: {
        width: "100%",
        marginTop: 40,
    },
});