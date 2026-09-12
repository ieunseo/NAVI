import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { ScheduleCard } from "@/components/home/ScheduleCard";

const WEEKDAYS = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
];

const schedules = [
    {
        id: "1",
        title: "책 읽기",
        time: "오후 8:00",
        status: "대기",
        completed: false,
        period: "오후",
    },
    {
        id: "2",
        title: "회의 준비",
        time: "오전 10:00",
        status: "대기",
        completed: false,
        period: "오전",
    },
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

    const [selectedFilter, setSelectedFilter] = useState<
        "전체" | "오전" | "오후"
    >("전체");

    const filteredSchedules =
        selectedFilter === "전체"
            ? schedules
            : schedules.filter(
                (schedule) => schedule.period === selectedFilter
            );

    const scheduleCount = schedules.length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    불러오는 중...
                </Text>
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
                            <Text style={styles.loginText}>
                                로그인
                            </Text>
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
                <View style={styles.dateArea}>
                    <Text style={styles.dateText}>
                        {todayText}
                    </Text>

                    <Text style={styles.subText}>
                        오늘도 차근차근 해볼까요?
                    </Text>
                </View>

                {/* 비회원 배너 */}
                {!session && (
                    <Pressable
                        style={styles.guestBanner}
                        onPress={handleAddSchedule}
                    >
                        <Text style={styles.guestBannerText}>
                            일정을 입력해 시작하세요
                        </Text>

                        <Text style={styles.guestBannerArrow}>
                            ›
                        </Text>
                    </Pressable>
                )}

                {/* 일정 헤더 */}
                <View style={styles.scheduleHeader}>
                    <Text style={styles.scheduleTitle}>
                        오늘의 할 일 {scheduleCount}
                    </Text>

                    <Text style={styles.deviceText}>
                        이 기기에 저장된 일정
                    </Text>
                </View>

                {/* 필터 */}
                <View style={styles.filterRow}>
                    <FilterButton
                        title="전체"
                        selected={selectedFilter === "전체"}
                        onPress={() => setSelectedFilter("전체")}
                    />

                    <FilterButton
                        title="오전"
                        selected={selectedFilter === "오전"}
                        onPress={() => setSelectedFilter("오전")}
                    />

                    <FilterButton
                        title="오후"
                        selected={selectedFilter === "오후"}
                        onPress={() => setSelectedFilter("오후")}
                    />
                </View>

                {/* 일정 */}
                {scheduleCount === 0 ? (
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
                ) : filteredSchedules.length === 0 ? (
                    <View style={styles.emptyArea}>
                        <Ionicons
                            name="calendar-outline"
                            size={44}
                            color="#C3C5CA"
                        />

                        <Text style={styles.emptyText}>
                            해당 시간대에 일정이 없어요.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.scheduleList}>
                        {filteredSchedules.map((schedule) => (
                            <ScheduleCard
                                key={schedule.id}
                                title={schedule.title}
                                time={schedule.time}
                                status={schedule.status}
                                completed={schedule.completed}
                                onPress={() => {
                                    console.log(
                                        "일정 선택:",
                                        schedule.id
                                    );
                                }}
                                onToggle={() => {
                                    console.log(
                                        "완료 상태 변경:",
                                        schedule.id
                                    );
                                }}
                            />
                        ))}
                    </View>
                )}

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
                          selected,
                          onPress,
                      }: {
    title: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={[
                styles.filterButton,
                selected && styles.filterButtonSelected,
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                ]}
            >
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

    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },

    loadingText: {
        fontSize: 16,
        color: "#777B84",
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

    scheduleHeader: {
        marginTop: 40,
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

    filterButtonSelected: {
        backgroundColor: "#111111",
        borderColor: "#111111",
    },

    filterText: {
        fontSize: 15,
        color: "#52555C",
    },

    filterTextSelected: {
        color: "#FFFFFF",
        fontWeight: "600",
    },

    scheduleList: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        gap: 12,
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
});