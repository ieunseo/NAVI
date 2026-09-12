import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AppButton } from "@/components/ui/AppButton";
import { AuthBackButton } from "@/components/auth/AuthBackButton";

import { Colors } from "@/constants/colors";
import { Layout } from "@/constants/layout";
import { Typography } from "@/constants/typography";

export default function SignupEmailSentScreen() {
    const { email } = useLocalSearchParams<{
        email?: string;
    }>();

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
    },
});