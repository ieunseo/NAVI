import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
    const [status, setStatus] = useState("확인 중...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSupabase = async () => {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.error("getSession error:", error);

                    setStatus("Supabase 연결 오류");
                    return;
                }

                console.log("session:", session);

                if (session) {
                    setStatus(
                        `로그인 상태\n${session.user.email ?? ""}`
                    );
                } else {
                    setStatus(
                        "Supabase 연결 정상\n현재 로그인된 사용자는 없습니다."
                    );
                }
            } catch (error) {
                console.error("Supabase error:", error);

                setStatus("Supabase 연결 오류");
            } finally {
                setLoading(false);
            }
        };

        checkSupabase();
    }, []);

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <Text style={styles.text}>
                    {status}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#FFFFFF",
    },

    text: {
        fontSize: 18,
        lineHeight: 28,
        textAlign: "center",
    },
});