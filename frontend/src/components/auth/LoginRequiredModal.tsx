import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type LoginRequiredModalProps = {
    visible: boolean;
    onClose: () => void;
    onDirectInput: () => void;
    onLogin: () => void;
};

export function LoginRequiredModal({
                                       visible,
                                       onClose,
                                       onDirectInput,
                                       onLogin,
                                   }: LoginRequiredModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/*
                 * 모달 바깥 영역
                 *
                 * Android 뒤로가기 또는
                 * 배경 터치 시 모달을 닫습니다.
                 */}
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />

                <View style={styles.modal}>
                    <Text style={styles.title}>
                        음성 입력은 로그인 후 이용해요
                    </Text>

                    <Text style={styles.description}>
                        직접 입력은 로그인 없이{"\n"}
                        사용할 수 있어요.
                    </Text>

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[
                                styles.button,
                                styles.directButton,
                            ]}
                            onPress={onDirectInput}
                        >
                            <Text
                                style={
                                    styles.directButtonText
                                }
                            >
                                직접 입력
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.button,
                                styles.loginButton,
                            ]}
                            onPress={onLogin}
                        >
                            <Text
                                style={
                                    styles.loginButtonText
                                }
                            >
                                로그인
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: "rgba(0, 0, 0, 0.32)",
        alignItems: "center",
        justifyContent: "center",
    },

    modal: {
        width: "100%",
        maxWidth: 342,
        paddingTop: 28,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
    },

    title: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: "700",
        color: "#111111",
        textAlign: "center",
    },

    description: {
        marginTop: 12,
        fontSize: 15,
        lineHeight: 22,
        color: "#777B84",
        textAlign: "center",
    },

    buttonRow: {
        marginTop: 28,
        flexDirection: "row",
        gap: 10,
    },

    button: {
        flex: 1,
        height: 52,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },

    directButton: {
        borderWidth: 1,
        borderColor: "#C7C9CE",
        backgroundColor: "#FFFFFF",
    },

    loginButton: {
        backgroundColor: "#111111",
    },

    directButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111111",
    },

    loginButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});