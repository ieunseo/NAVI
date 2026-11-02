import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";

import { AuthBackButton } from "../../components/auth/AuthBackButton";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { TermsAgreement } from "../../components/auth/TermsAgreement";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { PasswordInput } from "../../components/ui/PasswordInput";

import { Colors } from "../../constants/colors";
import { Layout } from "../../constants/layout";

import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../lib/api";
import { fetchRequiredTerms, type Term } from "../../lib/terms";

export default function SignupScreen() {
    const { signUp } = useAuth();

    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    const [nicknameError, setNicknameError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [terms, setTerms] = useState<Term[]>([]);
    const [termsLoadFailed, setTermsLoadFailed] = useState(false);
    const [agreedTermIds, setAgreedTermIds] = useState<Set<string>>(new Set());
    const [termsError, setTermsError] = useState("");

    const [loading, setLoading] = useState(false);

    /*
     * 현재 적용 중인 필수 약관
     * 약관 버전이 바뀌면 서버가 새 약관 id 를 내려줍니다.
     */
    const loadTerms = useCallback(async () => {
        try {
            setTermsLoadFailed(false);
            setTerms(await fetchRequiredTerms());
        } catch (error) {
            console.error("load terms error:", error);
            setTermsLoadFailed(true);
        }
    }, []);

    useEffect(() => {
        void loadTerms();
    }, [loadTerms]);

    const validate = () => {
        let valid = true;

        setNicknameError("");
        setPasswordError("");
        setTermsError("");

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

        const requiredAgreed =
            terms.length > 0 &&
            terms
                .filter((term) => term.required)
                .every((term) => agreedTermIds.has(term.id));

        if (!requiredAgreed) {
            setTermsError("필수 약관에 모두 동의해 주세요.");
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

            // 가입하면 인증 메일이 발송됩니다.
            const { email: sentEmail } = await signUp({
                email: email.trim(),
                password,
                nickname: nickname.trim(),
                agreedTermIds: [...agreedTermIds],
            });

            router.push({
                pathname: "/auth/signup-email-sent",
                params: {
                    email: sentEmail,
                },
            });
        } catch (error) {
            if (error instanceof ApiError) {
                // 가입 도중 약관 버전이 바뀐 경우 최신 약관으로 다시 동의받습니다.
                if (error.code === "REQUIRED_TERMS_NOT_AGREED") {
                    setAgreedTermIds(new Set());
                    void loadTerms();
                }

                Alert.alert(
                    "회원가입에 실패했어요",
                    error.message
                );
                return;
            }

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

                    <View style={styles.termsArea}>
                        {termsLoadFailed ? (
                            <View style={styles.termsFailed}>
                                <Text style={styles.termsFailedText}>
                                    약관을 불러오지 못했어요.
                                </Text>
                                <AppButton
                                    title="다시 불러오기"
                                    variant="secondary"
                                    onPress={loadTerms}
                                />
                            </View>
                        ) : (
                            <TermsAgreement
                                terms={terms}
                                agreedIds={agreedTermIds}
                                onChange={(next) => {
                                    setAgreedTermIds(next);
                                    setTermsError("");
                                }}
                                error={termsError}
                            />
                        )}
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

    termsArea: {
        marginTop: 36,
    },

    termsFailed: {
        gap: 12,
    },

    termsFailedText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },

    buttonArea: {
        marginTop: 32,
    },
});