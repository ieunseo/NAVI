import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AppErrorScreenProps = {
    title?: string;
    message?: string;
    retrying?: boolean;
    onRetry: () => void;
};

export function AppErrorScreen({
                                   title = "앱을 불러오지 못했어요",
                                   message = "네트워크 상태를 확인한 후 다시 시도해주세요.",
                                   retrying = false,
                                   onRetry,
                               }: AppErrorScreenProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconArea}>
                <Ionicons
                    name="cloud-offline-outline"
                    size={42}
                    color="#111111"
                />
            </View>

            <Text style={styles.title}>
                {title}
            </Text>

            <Text style={styles.message}>
                {message}
            </Text>

            <Pressable
                style={[
                    styles.retryButton,
                    retrying && styles.retryButtonDisabled,
                ]}
                onPress={onRetry}
                disabled={retrying}
                accessibilityRole="button"
                accessibilityState={{
                    disabled: retrying,
                    busy: retrying,
                }}
            >
                <Text style={styles.retryButtonText}>
                    {retrying
                        ? "다시 불러오는 중..."
                        : "다시 시도"}
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    iconArea: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F5F5F6",
    },

    title: {
        marginTop: 24,
        fontSize: 22,
        lineHeight: 30,
        fontWeight: "700",
        color: "#111111",
        textAlign: "center",
    },

    message: {
        marginTop: 12,
        fontSize: 15,
        lineHeight: 23,
        color: "#7B7F8A",
        textAlign: "center",
    },

    retryButton: {
        width: "100%",
        height: 56,
        marginTop: 36,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111111",
    },

    retryButtonDisabled: {
        opacity: 0.5,
    },

    retryButtonText: {
        fontSize: 17,
        lineHeight: 24,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});