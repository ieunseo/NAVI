import { Stack } from "expo-router";

import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout() {
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