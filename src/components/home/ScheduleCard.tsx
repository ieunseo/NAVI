import { Pressable, StyleSheet, Text, View } from "react-native";

type ScheduleCardProps = {
    title: string;
    time: string;
    status: string;
    completed?: boolean;
    onPress?: () => void;
    onToggle?: () => void;
};

export function ScheduleCard({
                                 title,
                                 time,
                                 status,
                                 completed = false,
                                 onPress,
                                 onToggle,
                             }: ScheduleCardProps) {
    return (
        <Pressable
            style={styles.card}
            onPress={onPress}
        >
            <Pressable
                style={[
                    styles.checkButton,
                    completed && styles.checkButtonCompleted,
                ]}
                onPress={onToggle}
                hitSlop={8}
            >
                {completed && (
                    <Text style={styles.checkMark}>
                        ✓
                    </Text>
                )}
            </Pressable>

            <View style={styles.content}>
                <Text
                    style={[
                        styles.title,
                        completed && styles.completedText,
                    ]}
                >
                    {title}
                </Text>

                <Text style={styles.time}>
                    {time}
                </Text>
            </View>

            <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                    {status}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        minHeight: 96,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: "#E0E1E5",
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
    },

    checkButton: {
        width: 28,
        height: 28,
        borderWidth: 1.5,
        borderColor: "#555555",
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    checkButtonCompleted: {
        backgroundColor: "#111111",
        borderColor: "#111111",
    },

    checkMark: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    content: {
        flex: 1,
        marginLeft: 26,
    },

    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111111",
    },

    time: {
        marginTop: 8,
        fontSize: 16,
        color: "#858992",
    },

    completedText: {
        textDecorationLine: "line-through",
        color: "#999999",
    },

    statusBadge: {
        minWidth: 60,
        height: 36,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#D96B78",
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },

    statusText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#333333",
    },
});