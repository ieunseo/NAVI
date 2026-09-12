import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { Layout } from "@/constants/layout";
import { Typography } from "@/constants/typography";

type PasswordInputProps = TextInputProps & {
    label?: string;
    error?: string;
    helperText?: string;
};

export function PasswordInput({
                                  label,
                                  error,
                                  helperText,
                                  style,
                                  ...props
                              }: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    const hasError = Boolean(error);

    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <View
                style={[
                    styles.inputWrapper,
                    hasError && styles.inputWrapperError,
                ]}
            >
                <TextInput
                    secureTextEntry={!visible}
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, style]}
                    {...props}
                />

                <Pressable
                    onPress={() => setVisible((prev) => !prev)}
                    hitSlop={10}
                    style={styles.eyeButton}
                >
                    <Ionicons
                        name={visible ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={Colors.textSecondary}
                    />
                </Pressable>
            </View>

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : helperText ? (
                <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },

    label: {
        ...Typography.label,
        color: Colors.textPrimary,
        marginBottom: 8,
    },

    inputWrapper: {
        width: "100%",
        height: Layout.inputHeight,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.borderRadiusSmall,
        backgroundColor: Colors.inputBackground,
        flexDirection: "row",
        alignItems: "center",
    },

    inputWrapperError: {
        borderColor: Colors.errorBorder,
        backgroundColor: Colors.errorBackground,
    },

    input: {
        flex: 1,
        height: "100%",
        paddingLeft: 16,
        paddingRight: 8,
        color: Colors.textPrimary,
        ...Typography.input,
    },

    eyeButton: {
        width: 48,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },

    helperText: {
        marginTop: 6,
        color: Colors.textTertiary,
        ...Typography.helper,
    },

    errorText: {
        marginTop: 6,
        color: Colors.error,
        ...Typography.helper,
    },
});