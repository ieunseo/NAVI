import { useEffect } from "react";
import { Stack } from "expo-router"; // 앱은 stack으로 route
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../providers/AuthProvider";

/* 앱 전체의 최상위 레이아웃
1. Native Splash Screen 제어
2. 앱 전체에 AuthProvider 적용
3. Expo Router의 Stack 화면 등록
* */

/*
* 앱 실행->Splash 표시->우리가 hideAsync()를 호출할 때까지 유지3
* 앱이 렌더링되기 가능한 한 이른 시점에 자동 종료를 막음
* */
SplashScreen.preventAutoHideAsync();

// 이 함수가 src/app 아래에 있는 모든 화면의 부모 레이아웃
export default function RootLayout() {
    useEffect(() => {
        const prepare = async () => {
            try {
                // React Native 앱이 렌더링 준비가 된 뒤
                // Native Splash를 닫는다.
                await SplashScreen.hideAsync();
            } catch (error) {
                console.error("Splash hide error:", error);
            }
        };

        prepare();
    }, []); // 처음 실행된 뒤 한번만 동작 (빈배열때문에)

    return (
        <AuthProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="permissions" />
                <Stack.Screen name="create" />
                <Stack.Screen name="explore" />
                <Stack.Screen name="schedule-edit"/>
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