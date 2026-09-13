import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { DirectInputSheet } from "@/components/schedule/DirectInputSheet";

export default function CreateScheduleScreen() {
    const [isDirectInputOpen, setIsDirectInputOpen] =
        useState(false);

    const handleStartVoice = () => {
        // 추후 마이크 권한 + 음성 입력 기능 연결
        console.log("음성 입력 시작");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* 뒤로가기 */}
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={10}
                >
                    <Ionicons
                        name="chevron-back"
                        size={28}
                        color="#111111"
                    />
                </Pressable>

                {/* 본문 */}
                <View style={styles.content}>
                    <Text style={styles.title}>
                        음성으로 일정 추가
                    </Text>

                    <Text style={styles.subtitle}>
                        어떤 일정이 있나요?
                    </Text>

                    {/* 음성 입력 예시 */}
                    <View style={styles.exampleBox}>
                        <Text style={styles.exampleText}>
                            “내일 오후 3시 30분에{"\n"}
                            치과에 갈 거야.{"\n"}
                            30분 전에 알려줘.”
                        </Text>
                    </View>

                    {/* 마이크 */}
                    <View style={styles.micOuter}>
                        <View style={styles.micInner}>
                            <Ionicons
                                name="mic-outline"
                                size={58}
                                color="#111111"
                            />
                        </View>
                    </View>
                </View>

                {/* 하단 버튼 */}
                <View style={styles.bottomArea}>
                    <Pressable
                        style={styles.voiceButton}
                        onPress={handleStartVoice}
                    >
                        <Text style={styles.voiceButtonText}>
                            음성 입력 시작
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.directButton}
                        onPress={() => setIsDirectInputOpen(true)}
                    >
                        <Text style={styles.directButtonText}>
                            직접 입력
                        </Text>
                    </Pressable>
                </View>

                {/* 직접 입력 Bottom Sheet */}
                <DirectInputSheet
                    visible={isDirectInputOpen}
                    onClose={() => setIsDirectInputOpen(false)}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    backButton: {
        position: "absolute",
        top: 16,
        left: 20,
        zIndex: 10,

        width: 40,
        height: 40,

        justifyContent: "center",
    },

    content: {
        flex: 1,
        alignItems: "center",

        paddingHorizontal: 24,
        paddingTop: 100,
    },

    title: {
        fontSize: 28,
        lineHeight: 38,
        fontWeight: "700",
        color: "#111111",
    },

    subtitle: {
        marginTop: 12,

        fontSize: 16,
        lineHeight: 24,
        color: "#8A8E96",
    },

    exampleBox: {
        width: "100%",

        marginTop: 52,
        paddingHorizontal: 20,
        paddingVertical: 22,

        borderRadius: 16,

        backgroundColor: "#F5F5F6",
    },

    exampleText: {
        textAlign: "center",

        fontSize: 18,
        lineHeight: 28,
        color: "#4D5057",
    },

    micOuter: {
        width: 184,
        height: 184,

        marginTop: 28,

        borderRadius: 92,

        backgroundColor: "#F8D2CB",

        alignItems: "center",
        justifyContent: "center",
    },

    micInner: {
        width: 148,
        height: 148,

        borderRadius: 74,

        backgroundColor: "#FFFFFF",

        alignItems: "center",
        justifyContent: "center",
    },

    bottomArea: {
        paddingHorizontal: 24,
        paddingBottom: 20,

        gap: 14,
    },

    voiceButton: {
        height: 56,

        borderRadius: 4,

        backgroundColor: "#111111",

        alignItems: "center",
        justifyContent: "center",
    },

    voiceButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    directButton: {
        height: 56,

        borderWidth: 1,
        borderColor: "#9A9EA8",
        borderRadius: 4,

        backgroundColor: "#FFFFFF",

        alignItems: "center",
        justifyContent: "center",
    },

    directButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111111",
    },
});