import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";

type AuthBackButtonProps = {
    onPress?: () => void;
};

export function AuthBackButton({
                                   onPress,
                               }: AuthBackButtonProps) {
    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        router.back();
    };

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={10}
            style={styles.button}
        >
            <Ionicons
                name="chevron-back"
                size={28}
                color={Colors.textPrimary}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        alignItems: "flex-start",
        justifyContent: "center",
    },
});