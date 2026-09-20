import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function CreateScreen() {
    /*
     * AI 음성 일정 입력 시작
     *
     * 실제 녹음 및 AI 분석 기능은
     * 음성 일정 생성 Issue에서 구현합니다.
     */
    const handleStartVoiceInput = () => {
        console.log(
            "음성 입력 시작 - 추후 구현"
        );
    };

    /*
     * 직접 입력은 별도의 화면으로 분리합니다.
     *
     * 비회원 / 무료회원 / 유료회원 모두
     * 직접 입력 자체는 사용할 수 있습니다.
     */
    const handleDirectInput = () => {
        router.push("/create-manual");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* 상단 */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        hitSlop={12}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={28}
                            color="#111111"
                        />
                    </Pressable>
                </View>

                {/* 제목 */}
                <View style={styles.titleArea}>
                    <Text style={styles.title}>
                        음성으로 일정 추가
                    </Text>

                    <Text style={styles.subtitle}>
                        어떤 일정이 있나요?
                    </Text>
                </View>

                {/* 음성 예시 */}
                <View style={styles.exampleBox}>
                    <Text style={styles.exampleText}>
                        “내일 오후 3시 30분에{"\n"}
                        치과에 갈 거야.{"\n"}
                        30분 전에 알려줘.”
                    </Text>
                </View>

                {/* 마이크 */}
                <View style={styles.voiceArea}>
                    <View style={styles.micOuter}>
                        <View style={styles.micInner}>
                            <Ionicons
                                name="mic-outline"
                                size={52}
                                color="#111111"
                            />
                        </View>
                    </View>
                </View>

                {/* 하단 버튼 */}
                <View style={styles.bottomArea}>
                    <Pressable
                        style={styles.voiceButton}
                        onPress={handleStartVoiceInput}
                    >
                        <Text style={styles.voiceButtonText}>
                            음성 입력 시작
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.manualButton}
                        onPress={handleDirectInput}
                    >
                        <Text style={styles.manualButtonText}>
                            직접 입력
                        </Text>
                    </Pressable>
                </View>
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
        paddingHorizontal: 24,
        backgroundColor: "#FFFFFF",
    },

    header: {
        height: 64,
        justifyContent: "center",
        alignItems: "flex-start",
    },

    titleArea: {
        marginTop: 26,
        alignItems: "center",
    },

    title: {
        fontSize: 28,
        lineHeight: 38,
        fontWeight: "700",
        color: "#111111",
        textAlign: "center",
    },

    subtitle: {
        marginTop: 10,
        fontSize: 16,
        lineHeight: 24,
        color: "#92959C",
        textAlign: "center",
    },

    exampleBox: {
        marginTop: 46,
        minHeight: 122,
        paddingHorizontal: 24,
        paddingVertical: 22,
        borderRadius: 14,
        backgroundColor: "#F5F5F6",
        alignItems: "center",
        justifyContent: "center",
    },

    exampleText: {
        fontSize: 17,
        lineHeight: 27,
        color: "#55585F",
        textAlign: "center",
    },

    voiceArea: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    micOuter: {
        width: 174,
        height: 174,
        borderRadius: 87,
        backgroundColor: "#F8CDCA",
        alignItems: "center",
        justifyContent: "center",
    },

    micInner: {
        width: 142,
        height: 142,
        borderRadius: 71,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    bottomArea: {
        paddingBottom: 16,
        gap: 12,
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

    manualButton: {
        height: 56,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#BFC1C6",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    manualButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111111",
    },
});