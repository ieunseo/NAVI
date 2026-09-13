import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useEffect(() => {
        const hideSplash = async () => {
            await SplashScreen.hideAsync();
        };

        hideSplash();
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
                <Stack.Screen
                    name="auth"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>
        </AuthProvider>
    );
}