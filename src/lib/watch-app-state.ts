import { AppState, Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export function watchAppState() {
    if (Platform.OS === "web") {
        return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
            supabase.auth.startAutoRefresh();
        } else {
            supabase.auth.stopAutoRefresh();
        }
    });

    return () => {
        subscription.remove();
    };
}