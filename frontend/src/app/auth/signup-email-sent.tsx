import { useState } from "react";
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { resendVerificationEmail } from "../../lib/auth-session";

import { AppButton } from "../../components/ui/AppButton";
import { AuthBackButton } from "../../components/auth/AuthBackButton";

import { Colors } from "../../constants/colors";
import { Layout } from "../../constants/layout";
import { Typography } from "../../constants/typography";

export default function SignupEmailSentScreen() {
    const { email } = useLocalSearchParams<{
        email?: string;
    }>();

    const [resending, setResending] = useState(false);

    /*
     * 같은 메일로 너무 자주 요청하면
     * 서버가 조용히 무시하므로 안내 문구는 항상 같습니다.
     */
    const handleResend = async () => {
        if (!email) {
            return;
        }

        try {
            setResending(true);

            await resendVerificationEmail(email);

            Alert.alert(
                "인증 메일을 다시 보냈어요",
                "메일이 보이지 않으면 스팸함도 확인해 주세요."
            );
        } catch (error) {
            console.error("resend verification error:", error);

            Alert.alert(
                "메일을 보내지 못했어요",
                "잠시 후 다시 시도해 주세요."
            );
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
                <AuthBackButton />

                <View style={styles.messageArea}>
                    <Text style={styles.title}>
                        인증 메일을 보냈어요
                    </Text>

                    <Text style={styles.description}>
                        {email ?? "입력하신 이메일"}으로{"\n"}
                        인증 메일을 보냈어요.
                    </Text>

                    <Text style={styles.guide}>
                        이메일의 인증 링크를 눌러{"\n"}
                        가입을 완료해 주세요.
                    </Text>
                </View>

                <View style={styles.buttonArea}>
                    <AppButton
                        title="인증 메일 다시 보내기"
                        variant="secondary"
                        loading={resending}
                        disabled={!email || resending}
                        onPress={handleResend}
                    />

                    <AppButton
                        title="로그인 화면으로"
                        onPress={() => router.replace("/auth/login")}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    content: {
        flex: 1,
        paddingHorizontal: Layout.screenPaddingHorizontal,
        paddingTop: 12,
        paddingBottom: 32,
    },

    messageArea: {
        marginTop: 92,
        alignItems: "center",
    },

    title: {
        ...Typography.title,
        color: Colors.textPrimary,
        textAlign: "center",
    },

    description: {
        marginTop: 24,
        ...Typography.subtitle,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    guide: {
        marginTop: 28,
        ...Typography.subtitle,
        color: Colors.textPrimary,
        textAlign: "center",
    },

    buttonArea: {
        marginTop: "auto",
        gap: 12,
    },
});