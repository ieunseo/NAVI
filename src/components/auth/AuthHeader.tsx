import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

type AuthHeaderProps = {
    title: string;
    description: string;
};

export function AuthHeader({
                               title,
                               description,
                           }: AuthHeaderProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },

    title: {
        ...Typography.title,
        color: Colors.textPrimary,
        textAlign: "center",
    },

    description: {
        marginTop: 16,
        ...Typography.subtitle,
        color: Colors.textSecondary,
        textAlign: "center",
    },
});