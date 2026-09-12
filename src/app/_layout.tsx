import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
    duration: 400,
    fade: true,
});

export default function RootLayout() {
    useEffect(() => {
        const prepare = async () => {
            try {
                // 나중에 폰트 로딩이나 초기 설정 로딩을 여기서 처리
            } catch (error) {
                console.warn(error);
            } finally {
                await SplashScreen.hideAsync();
            }
        };

        prepare();
    }, []);

    return (
        <AuthProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="create" />
                <Stack.Screen name="explore" />
                <Stack.Screen name="auth" />
            </Stack>
        </AuthProvider>
    );
}