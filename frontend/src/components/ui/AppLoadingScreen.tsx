import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

export function AppLoadingScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.logo}>
                Navi
            </Text>

            <Text style={styles.subtitle}>
                말 한마디로 정리하는 하루
            </Text>

            <ActivityIndicator
                size="large"
                color="#F3B8BA"
                style={styles.spinner}
            />

            <Text style={styles.loadingText}>
                데이터를 불러오는 중이에요
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111111",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    logo: {
        fontSize: 34,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    subtitle: {
        marginTop: 12,
        fontSize: 15,
        color: "#FFFFFF",
    },

    spinner: {
        marginTop: 54,
    },

    loadingText: {
        marginTop: 20,
        fontSize: 14,
        color: "#D7D7D7",
    },
});