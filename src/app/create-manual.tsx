import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function CreateManualScreen() {
    const [title, setTitle] = useState("");

    /*
     * 현재 Issue에서는 직접 입력 화면 구조까지만 구현합니다.
     *
     * 날짜 / 시간 / 알림 선택 기능은
     * 직접 일정 생성 Issue에서 구현합니다.
     */
    const handleConfirm = () => {
        console.log("직접 입력 일정 확인:", {
            title,
        });

        /*
         * TODO
         * 직접 일정 생성 플로우 구현 시
         * 입력값 검증 및 다음 단계 연결
         */
    };

    const canContinue = title.trim().length > 0;

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

                    <Text style={styles.headerTitle}>
                        직접 입력
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                {/* 안내 */}
                <View style={styles.titleArea}>
                    <Text style={styles.title}>
                        일정을 입력해 주세요
                    </Text>

                    <Text style={styles.subtitle}>
                        필요한 일정 정보를 직접 입력할 수 있어요.
                    </Text>
                </View>

                {/* 입력 폼 */}
                <View style={styles.form}>
                    {/* 제목 */}
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>
                            제목
                        </Text>

                        <TextInput
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="일정 제목을 입력해 주세요"
                            placeholderTextColor="#A1A4AA"
                            maxLength={50}
                        />
                    </View>

                    {/* 날짜 */}
                    <Pressable
                        style={styles.optionRow}
                        onPress={() => {
                            console.log(
                                "날짜 선택 - 추후 구현"
                            );
                        }}
                    >
                        <Text style={styles.label}>
                            날짜
                        </Text>

                        <View style={styles.optionValueArea}>
                            <Text style={styles.optionPlaceholder}>
                                날짜 선택
                            </Text>

                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#8A8E96"
                            />
                        </View>
                    </Pressable>

                    {/* 시간 */}
                    <Pressable
                        style={styles.optionRow}
                        onPress={() => {
                            console.log(
                                "시간 선택 - 추후 구현"
                            );
                        }}
                    >
                        <Text style={styles.label}>
                            시간
                        </Text>

                        <View style={styles.optionValueArea}>
                            <Text style={styles.optionPlaceholder}>
                                시간 선택
                            </Text>

                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#8A8E96"
                            />
                        </View>
                    </Pressable>

                    {/* 알림 */}
                    <Pressable
                        style={[
                            styles.optionRow,
                            styles.lastOptionRow,
                        ]}
                        onPress={() => {
                            console.log(
                                "알림 선택 - 추후 구현"
                            );
                        }}
                    >
                        <Text style={styles.label}>
                            알림
                        </Text>

                        <View style={styles.optionValueArea}>
                            <Text style={styles.optionPlaceholder}>
                                알림 없음
                            </Text>

                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#8A8E96"
                            />
                        </View>
                    </Pressable>
                </View>

                {/* 안내 */}
                <View style={styles.guide}>
                    <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#92959C"
                    />

                    <Text style={styles.guideText}>
                        제목 · 날짜 · 시간을 입력해 주세요.
                    </Text>
                </View>

                <View style={styles.bottomArea}>
                    <Pressable
                        style={[
                            styles.confirmButton,
                            !canContinue &&
                            styles.confirmButtonDisabled,
                        ]}
                        onPress={handleConfirm}
                        disabled={!canContinue}
                    >
                        <Text
                            style={[
                                styles.confirmButtonText,
                                !canContinue &&
                                styles.confirmButtonTextDisabled,
                            ]}
                        >
                            일정 확인
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
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
    },

    header: {
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111111",
    },

    headerSpacer: {
        width: 28,
    },

    titleArea: {
        marginTop: 28,
    },

    title: {
        fontSize: 26,
        lineHeight: 36,
        fontWeight: "700",
        color: "#111111",
    },

    subtitle: {
        marginTop: 8,
        fontSize: 15,
        lineHeight: 22,
        color: "#8A8E96",
    },

    form: {
        marginTop: 36,
        borderWidth: 1,
        borderColor: "#E5E6E9",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },

    inputRow: {
        minHeight: 64,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEDEF",
    },

    optionRow: {
        minHeight: 64,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEDEF",
    },

    lastOptionRow: {
        borderBottomWidth: 0,
    },

    label: {
        width: 72,
        fontSize: 15,
        fontWeight: "500",
        color: "#55585F",
    },

    titleInput: {
        flex: 1,
        height: 56,
        fontSize: 15,
        color: "#111111",
    },

    optionValueArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    optionPlaceholder: {
        fontSize: 15,
        color: "#8A8E96",
    },

    guide: {
        marginTop: 16,
        minHeight: 44,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 4,
        backgroundColor: "#F7F7F8",
    },

    guideText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: "#8A8E96",
    },

    bottomArea: {
        marginTop: "auto",
        paddingBottom: 16,
    },

    confirmButton: {
        height: 56,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111111",
    },

    confirmButtonDisabled: {
        backgroundColor: "#D5D6D9",
    },

    confirmButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    confirmButtonTextDisabled: {
        color: "#F7F7F7",
    },
});