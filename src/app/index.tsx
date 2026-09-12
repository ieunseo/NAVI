import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";


const WEEKDAYS = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
];

function getTodayText() {
    const today = new Date();

    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = WEEKDAYS[today.getDay()];

    return `${month}월 ${date}일 ${day}`;
}

export default function HomeScreen() {
    const todayText = getTodayText();
    const { session, loading } = useAuth();

    //loading 처리
    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFFFFF",
                }}
            >
                <Text>불러오는 중...</Text>
            </View>
        );
    }

    const handleLogin = () => {
        router.push("/auth/login");
    };

    const handleAddSchedule = () => {
        router.push("/create");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* 상단 */}
                <View style={styles.topBar}>
                    {!session ? (
                        <Pressable
                            onPress={handleLogin}
                            hitSlop={10}
                        >
                            <Text style={styles.loginText}>로그인</Text>
                        </Pressable>
                    ) : (
                        <Text style={styles.loginText}>
                            {session.user.user_metadata.nickname ?? "NAVI"}
                        </Text>
                    )}

                    <Pressable
                        onPress={handleAddSchedule}
                        hitSlop={10}
                    >
                        <Ionicons
                            name="add-outline"
                            size={32}
                            color="#111111"
                        />
                    </Pressable>
                </View>

                {/* 날짜 */}
                {!session && (
                    <Pressable
                        style={styles.guestBanner}
                        onPress={handleAddSchedule}
                    >
                        <Text style={styles.guestBannerText}>
                            직접 입력으로 바로 시작하세요
                        </Text>

                        <Text style={styles.guestBannerArrow}>
                            ›
                        </Text>
                    </Pressable>
                )}

                {/* 일정 헤더 */}
                <View style={styles.scheduleHeader}>
                    <Text style={styles.scheduleTitle}>
                        오늘의 할 일 0
                    </Text>

                    <Text style={styles.deviceText}>
                        이 기기에 저장된 일정
                    </Text>
                </View>

                {/* 필터 */}
                <View style={styles.filterRow}>
                    <FilterButton title="전체" />
                    <FilterButton title="오전" />
                    <FilterButton title="오후" />
                </View>

                {/* 빈 일정 */}
                <View style={styles.emptyArea}>
                    <Ionicons
                        name="calendar-outline"
                        size={48}
                        color="#C3C5CA"
                    />

                    <Text style={styles.emptyText}>
                        아직 등록한 일정이 없어요.
                    </Text>

                    <Pressable
                        style={styles.addButton}
                        onPress={handleAddSchedule}
                    >
                        <Text style={styles.addButtonText}>
                            일정 직접 추가
                        </Text>
                    </Pressable>
                </View>

                {/* 하단 탭 */}
                <View style={styles.bottomNavigation}>
                    <BottomTab
                        icon="calendar-outline"
                        label="캘린더"
                    />

                    <BottomTab
                        icon="mic-outline"
                        label="음성 입력"
                    />

                    <BottomTab
                        icon="settings-outline"
                        label="설정"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

function FilterButton({
                          title,
                      }: {
    title: string;
}) {
    return (
        <Pressable style={styles.filterButton}>
            <Text style={styles.filterText}>
                {title}
            </Text>
        </Pressable>
    );
}

type BottomTabProps = {
    icon:
        | "calendar-outline"
        | "mic-outline"
        | "settings-outline";
    label: string;
};

function BottomTab({
                       icon,
                       label,
                   }: BottomTabProps) {
    return (
        <Pressable style={styles.bottomTab}>
            <Ionicons
                name={icon}
                size={27}
                color="#111111"
            />

            <Text style={styles.bottomTabText}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    topBar: {
        height: 70,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    loginText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111111",
    },

    dateArea: {
        paddingHorizontal: 24,
        marginTop: 16,
    },

    dateText: {
        fontSize: 28,
        lineHeight: 38,
        fontWeight: "700",
        color: "#111111",
    },

    subText: {
        marginTop: 8,
        fontSize: 17,
        lineHeight: 26,
        color: "#777B84",
    },

    scheduleHeader: {
        marginTop: 62,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    scheduleTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111111",
    },

    deviceText: {
        fontSize: 13,
        color: "#8A8E96",
    },

    filterRow: {
        marginTop: 22,
        paddingHorizontal: 24,
        flexDirection: "row",
        gap: 12,
    },

    filterButton: {
        minWidth: 84,
        height: 42,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: "#E0E1E5",
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8F8F9",
    },

    filterText: {
        fontSize: 15,
        color: "#52555C",
    },

    emptyArea: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 60,
    },

    emptyText: {
        marginTop: 28,
        fontSize: 16,
        color: "#8A8E96",
    },

    addButton: {
        width: "100%",
        height: 56,
        marginTop: 42,
        borderRadius: 4,
        backgroundColor: "#111111",
        alignItems: "center",
        justifyContent: "center",
    },

    addButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    bottomNavigation: {
        height: 94,
        borderTopWidth: 1,
        borderTopColor: "#E5E5E5",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "#FFFFFF",
        paddingBottom: 8,
    },

    bottomTab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    bottomTabText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#111111",
    },
    guestBanner: {
        marginTop: 24,
        marginHorizontal: 24,
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#FFF4F4",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    guestBannerText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#444444",
    },

    guestBannerArrow: {
        fontSize: 22,
        color: "#666666",
    },
});