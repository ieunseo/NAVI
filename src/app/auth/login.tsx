import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";

import { AuthBackButton } from "@/components/auth/AuthBackButton";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { PasswordInput } from "@/components/ui/PasswordInput";

import { Colors } from "@/constants/colors";
import { Layout } from "@/constants/layout";
import { Typography } from "@/constants/typography";

import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const canSubmit =
        email.trim().length > 0 &&
        password.trim().length > 0 &&
        !loading;

    const handleLogin = async () => {
        if (!canSubmit) {
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                Alert.alert(
                    "로그인 정보를 확인해 주세요",
                    "이메일 또는 비밀번호가 올바르지 않아요."
                );

                return;
            }

            router.replace("/");
        } catch (error) {
            console.error("login error:", error);

            Alert.alert(
                "로그인에 실패했어요",
                "잠시 후 다시 시도해 주세요."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = () => {
        router.push("/auth/signup");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.backButtonArea}>
                        <AuthBackButton />
                    </View>

                    <View style={styles.headerArea}>
                        <AuthHeader
                            title="다시 만나 반가워요"
                            description={
                                "오늘도, 나의 이야기가 시작되는 곳\nNavi에 오신 것을 환영해요."
                            }
                        />
                    </View>

                    <View style={styles.formArea}>
                        <AppInput
                            label="이메일 주소"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                        />

                        <PasswordInput
                            label="비밀번호"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="비밀번호를 입력해 주세요"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="password"
                        />
                    </View>

                    <View style={styles.buttonArea}>
                        <AppButton
                            title="로그인"
                            loading={loading}
                            disabled={!canSubmit}
                            onPress={handleLogin}
                        />

                        <AppButton
                            title="이메일로 회원가입"
                            variant="secondary"
                            onPress={handleSignup}
                        />
                    </View>

                    <View style={styles.linkArea}>
                        <Pressable>
                            <Text style={styles.linkText}>가입 정보 찾기</Text>
                        </Pressable>

                        <Text style={styles.divider}>|</Text>

                        <Pressable>
                            <Text style={styles.linkText}>비밀번호 재설정</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    keyboardAvoidingView: {
        flex: 1,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        flexGrow: 1,
        paddingHorizontal: Layout.screenPaddingHorizontal,
        paddingBottom: 32,
    },

    backButtonArea: {
        marginTop: 12,
    },

    headerArea: {
        marginTop: 28,
    },

    formArea: {
        marginTop: 70,
        gap: 38,
    },

    buttonArea: {
        marginTop: 40,
        gap: 18,
    },

    linkArea: {
        marginTop: 66,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },

    linkText: {
        ...Typography.link,
        color: Colors.textSecondary,
    },

    divider: {
        ...Typography.link,
        color: Colors.textTertiary,
    },
});