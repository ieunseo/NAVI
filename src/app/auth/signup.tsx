import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
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

import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    const [nicknameError, setNicknameError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [loading, setLoading] = useState(false);

    const validate = () => {
        let valid = true;

        setNicknameError("");
        setPasswordError("");

        if (nickname.trim().length === 0) {
            setNicknameError("닉네임을 입력해 주세요.");
            valid = false;
        } else if (nickname.trim().length > 8) {
            setNicknameError("닉네임은 8자 이하로 입력해 주세요.");
            valid = false;
        }

        if (password.length < 8) {
            setPasswordError("비밀번호는 8자 이상 입력해 주세요.");
            valid = false;
        } else if (password !== passwordConfirm) {
            setPasswordError("비밀번호가 일치하지 않아요.");
            valid = false;
        }

        if (!email.includes("@")) {
            Alert.alert("이메일 확인", "올바른 이메일 주소를 입력해 주세요.");
            valid = false;
        }

        return valid;
    };

    const handleSignup = async () => {
        if (!validate()) {
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    emailRedirectTo: "navi://auth/callback",
                    data: {
                        nickname: nickname.trim(),
                    },
                },
            });

            if (error) {
                Alert.alert(
                    "회원가입에 실패했어요",
                    error.message
                );
                return;
            }

            console.log("signup data:", data);

            router.push({
                pathname: "/auth/signup-email-sent",
                params: {
                    email: email.trim(),
                },
            });
        } catch (error) {
            console.error("signup error:", error);

            Alert.alert(
                "오류가 발생했어요",
                "잠시 후 다시 시도해 주세요."
            );
        } finally {
            setLoading(false);
        }
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
                            title="가입을 시작해 볼까요?"
                            description="Navi에서 사용할 정보를 입력해 주세요."
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

                        <AppInput
                            label="닉네임"
                            value={nickname}
                            onChangeText={(value) => {
                                setNickname(value);
                                setNicknameError("");
                            }}
                            placeholder="닉네임을 입력해 주세요"
                            error={nicknameError}
                            maxLength={9}
                        />

                        <PasswordInput
                            label="비밀번호"
                            value={password}
                            onChangeText={(value) => {
                                setPassword(value);
                                setPasswordError("");
                            }}
                            placeholder="비밀번호를 입력해 주세요"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                        />

                        <PasswordInput
                            label="비밀번호 확인"
                            value={passwordConfirm}
                            onChangeText={(value) => {
                                setPasswordConfirm(value);
                                setPasswordError("");
                            }}
                            placeholder="비밀번호를 다시 입력해 주세요"
                            autoCapitalize="none"
                            autoCorrect={false}
                            error={passwordError}
                        />
                    </View>

                    <View style={styles.buttonArea}>
                        <AppButton
                            title="계속하기"
                            loading={loading}
                            onPress={handleSignup}
                        />
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
        marginTop: 24,
    },

    formArea: {
        marginTop: 54,
        gap: 26,
    },

    buttonArea: {
        marginTop: 42,
    },
});