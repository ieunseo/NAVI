import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Layout } from "@/constants/layout";
import { Typography } from "@/constants/typography";

type AppInputProps = TextInputProps & {
    label?: string;
    error?: string;
    helperText?: string;
};

export function AppInput({
                             label,
                             error,
                             helperText,
                             style,
                             ...props
                         }: AppInputProps) {
    const hasError = Boolean(error);

    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <TextInput
                placeholderTextColor={Colors.textTertiary}
                style={[
                    styles.input,
                    hasError && styles.inputError,
                    style,
                ]}
                {...props}
            />

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

    input: {
        width: "100%",
        height: Layout.inputHeight,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.borderRadiusSmall,
        backgroundColor: Colors.inputBackground,
        paddingHorizontal: 16,
        color: Colors.textPrimary,
        ...Typography.input,
    },

    inputError: {
        borderColor: Colors.errorBorder,
        backgroundColor: Colors.errorBackground,
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