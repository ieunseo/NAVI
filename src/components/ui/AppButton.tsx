import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Layout } from "@/constants/layout";
import { Typography } from "@/constants/typography";

type AppButtonVariant = "primary" | "secondary";

type AppButtonProps = PressableProps & {
    title: string;
    variant?: AppButtonVariant;
    loading?: boolean;
};

export function AppButton({
                              title,
                              variant = "primary",
                              loading = false,
                              disabled,
                              ...props
                          }: AppButtonProps) {
    const isDisabled = disabled || loading;
    const isPrimary = variant === "primary";

    return (
        <Pressable
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                isPrimary ? styles.primary : styles.secondary,
                pressed && !isDisabled && styles.pressed,
                isDisabled && styles.disabled,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={isPrimary ? Colors.primaryText : Colors.textPrimary}
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        isPrimary ? styles.primaryText : styles.secondaryText,
                        isDisabled && styles.disabledText,
                    ]}
                >
                    {title}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        width: "100%",
        height: Layout.buttonHeight,
        borderRadius: Layout.borderRadiusSmall,
        alignItems: "center",
        justifyContent: "center",
    },

    primary: {
        backgroundColor: Colors.primary,
    },

    secondary: {
        backgroundColor: Colors.secondaryBackground,
        borderWidth: 1,
        borderColor: Colors.secondaryBorder,
    },

    pressed: {
        opacity: 0.85,
    },

    disabled: {
        backgroundColor: Colors.disabledBackground,
        borderColor: Colors.disabledBackground,
    },

    text: {
        ...Typography.button,
    },

    primaryText: {
        color: Colors.primaryText,
    },

    secondaryText: {
        color: Colors.secondaryText,
    },

    disabledText: {
        color: Colors.disabledText,
    },
});