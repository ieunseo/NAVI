import "react-native-url-polyfill/auto";
import "./session-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
    throw new Error(
        ".env에 Supabase URL과 Publishable Key를 입력하고 Expo를 재시작해주세요.",
    );
}

export const supabase = createClient(url, key, {
    auth: {
        storage: typeof localStorage !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
