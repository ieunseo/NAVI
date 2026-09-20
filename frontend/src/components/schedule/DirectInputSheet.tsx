import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

type DirectInputSheetProps = {
    visible: boolean;
    onClose: () => void;
};

export function DirectInputSheet({
                                     visible,
                                     onClose,
                                 }: DirectInputSheetProps) {
    const [title, setTitle] = useState("");

    const handleDatePress = () => {
        console.log("날짜 선택");
    };

    const handleTimePress = () => {
        console.log("시간 선택");
    };

    const handleNotificationPress = () => {
        console.log("알림 선택");
    };

    const handleConfirm = () => {
        console.log("일정 확인:", {
            title,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                {/* 어두운 배경 */}
                <Pressable
                    style={styles.overlay}
                    onPress={onClose}
                />

                {/* Bottom Sheet */}
                <View style={styles.sheet}>
                    {/* 드래그 핸들 */}
                    <View style={styles.handle} />

                    {/* 제목 */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            직접 입력
                        </Text>

                        <Pressable
                            onPress={onClose}
                            hitSlop={10}
                        >
                            <Ionicons
                                name="close-outline"
                                size={30}
                                color="#111111"
                            />
                        </Pressable>
                    </View>

                    {/* 입력 카드 */}
                    <View style={styles.formCard}>
                        {/* 제목 */}
                        <View style={styles.titleRow}>
                            <Text style={styles.label}>
                                제목
                            </Text>

                            <TextInput
                                style={styles.titleInput}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="입력해 주세요"
                                placeholderTextColor="#8A8E96"
                                maxLength={50}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* 날짜 */}
                        <Pressable
                            style={styles.row}
                            onPress={handleDatePress}
                        >
                            <Text style={styles.label}>
                                날짜
                            </Text>

                            <View style={styles.valueArea}>
                                <Text style={styles.placeholder}>
                                    날짜 선택
                                </Text>

                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color="#8A8E96"
                                />
                            </View>
                        </Pressable>

                        <View style={styles.divider} />

                        {/* 시간 */}
                        <Pressable
                            style={styles.row}
                            onPress={handleTimePress}
                        >
                            <Text style={styles.label}>
                                시간
                            </Text>

                            <View style={styles.valueArea}>
                                <Text style={styles.placeholder}>
                                    시간 선택
                                </Text>

                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color="#8A8E96"
                                />
                            </View>
                        </Pressable>

                        <View style={styles.divider} />

                        {/* 알림 */}
                        <Pressable
                            style={styles.row}
                            onPress={handleNotificationPress}
                        >
                            <Text style={styles.label}>
                                알림
                            </Text>

                            <View style={styles.valueArea}>
                                <Text style={styles.placeholder}>
                                    알림 선택
                                </Text>

                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color="#8A8E96"
                                />
                            </View>
                        </Pressable>
                    </View>

                    {/* 일정 확인 */}
                    <Pressable
                        style={styles.confirmButton}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmButtonText}>
                            일정 확인
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },

    overlay: {
        ...StyleSheet.absoluteFill,

        backgroundColor: "rgba(0, 0, 0, 0.32)",
    },

    sheet: {
        width: "100%",

        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 44,

        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,

        backgroundColor: "#FFFFFF",
    },

    handle: {
        width: 48,
        height: 4,

        alignSelf: "center",

        marginBottom: 24,

        borderRadius: 2,

        backgroundColor: "#BFC1C7",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        marginBottom: 20,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111111",
    },

    formCard: {
        borderWidth: 1,
        borderColor: "#DDDFE4",
        borderRadius: 18,

        backgroundColor: "#FFFFFF",

        overflow: "hidden",
    },

    titleRow: {
        minHeight: 72,

        paddingHorizontal: 18,

        flexDirection: "row",
        alignItems: "center",
    },

    row: {
        minHeight: 72,

        paddingHorizontal: 18,

        flexDirection: "row",
        alignItems: "center",
    },

    label: {
        width: 92,

        fontSize: 16,
        color: "#555961",
    },

    titleInput: {
        flex: 1,

        height: 60,

        paddingVertical: 0,

        fontSize: 16,
        color: "#111111",
    },

    valueArea: {
        flex: 1,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    placeholder: {
        fontSize: 16,
        color: "#8A8E96",
    },

    divider: {
        height: 1,

        marginHorizontal: 18,

        backgroundColor: "#E7E8EB",
    },

    confirmButton: {
        height: 56,

        marginTop: 62,

        borderRadius: 4,

        backgroundColor: "#111111",

        alignItems: "center",
        justifyContent: "center",
    },

    confirmButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});