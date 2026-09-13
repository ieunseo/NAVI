import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors } from "@/constants/colors";
import { STORAGE_KEYS } from "@/constants/storageKeys";

import { supabase } from "@/lib/supabase";

import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";

import { ScheduleCard } from "@/components/home/ScheduleCard";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { AppErrorScreen } from "@/components/ui/AppErrorScreen";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";

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

    const {
        session,
        loading,
        error: authError,
        retry: retryAuth,
    } = useAuth();

    /*
     * 회원 전용 기능 접근 시
     * 로그인 여부를 확인하기 위한 공통 Hook
     */
    const {
        requireAuth,
        loginRequiredVisible,
        closeLoginRequired,
        goToLogin,
    } = useRequireAuth();

    const [
        checkingPermissionOnboarding,
        setCheckingPermissionOnboarding,
    ] = useState(true);

    const [selectedFilter, setSelectedFilter] =
        useState<"전체" | "오전" | "오후">("전체");

    /*
     * 최초 앱 진입 시 권한 온보딩 완료 여부 확인
     *
     * permission_onboarding_completed 값이 없으면
     * 아직 권한 안내를 완료하지 않은 사용자이므로
     * permissions 화면으로 이동합니다.
     */
    useEffect(() => {
        let mounted = true;

        const checkPermissionOnboarding = async () => {
            try {
                const completed =
                    await AsyncStorage.getItem(
                        STORAGE_KEYS.permissionOnboardingCompleted
                    );

                if (!mounted) {
                    return;
                }

                if (completed !== "true") {
                    router.replace("/permissions");
                    return;
                }

                setCheckingPermissionOnboarding(false);
            } catch (error) {
                console.error(
                    "권한 온보딩 상태 확인 오류:",
                    error
                );

                /*
                 * AsyncStorage 확인에 실패했다고 해서
                 * 앱 사용 자체를 막지는 않습니다.
                 */
                if (mounted) {
                    setCheckingPermissionOnboarding(false);
                }
            }
        };

        void checkPermissionOnboarding();

        return () => {
            mounted = false;
        };
    }, []);

    const filteredSchedules =
        selectedFilter === "전체"
            ? schedules
            : schedules.filter(
                (schedule) =>
                    schedule.period === selectedFilter
            );

    const scheduleCount = schedules.length;

    /*
     * =====================================================
     * [개발용 테스트 코드]
     *
     * AppErrorScreen UI를 강제로 확인하기 위한 코드입니다.
     *
     * true
     * → 항상 오류 화면 표시
     *
     * false
     * → 정상 앱 흐름
     *
     * 평소 개발 시 false로 두고,
     * 오류 화면 UI 확인이 필요할 때만 true로 변경합니다.
     * =====================================================
     */
    const FORCE_ERROR_SCREEN_FOR_TEST = false;

    if (FORCE_ERROR_SCREEN_FOR_TEST) {
        return (
            <AppErrorScreen
                onRetry={() => {
                    console.log(
                        "[개발용] 오류 화면 다시 시도 버튼 클릭"
                    );
                }}
            />
        );
    }

    /*
     * [개발용 테스트 코드]
     *
     * 비회원 상태 테스트를 위한 임시 로그아웃 기능입니다.
     *
     * 로그인 상태에서 왼쪽 상단 닉네임을 누르면
     * 현재 Supabase Session을 로그아웃합니다.
     */
    const handleLogoutForTest = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error(
                "[개발용] 로그아웃 오류:",
                error
            );
            return;
        }

        console.log(
            "[개발용] 로그아웃 완료"
        );
    };

    /*
     * =====================================================
     * =====================================================
     */

    /*
     * Supabase Session 복구 또는
     * 최초 권한 온보딩 상태 확인 중에는
     * Home 대신 Loading 화면을 표시합니다.
     */
    if (loading || checkingPermissionOnboarding) {
        return <AppLoadingScreen />;
    }

    /*
     * Supabase Auth 초기화 중 오류가 발생한 경우
     * 오류 화면을 표시하고 다시 시도할 수 있게 합니다.
     */
    if (authError) {
        return (
            <AppErrorScreen
                message={authError}
                onRetry={retryAuth}
            />
        );
    }

    const handleLogin = () => {
        router.push("/auth/login");
    };

    /*
     * 직접 일정 입력
     *
     * 비회원 / 무료회원 / 유료회원 모두
     * 로그인 없이 사용할 수 있습니다.
     */
    const handleManualInput = () => {
        router.push("/create-manual");
    };

    /*
     * AI 음성 입력
     *
     * 현재 단계에서는 로그인 여부를 검사합니다.
     *
     * 비회원
     * → 로그인 안내 모달
     *
     * 로그인 회원
     * → 음성 입력 화면
     *
     * TODO
     * 구독 기능 구현 시 로그인 회원을
     * 무료회원 / 유료회원으로 한 번 더 분기합니다.
     */
    const handleVoiceInput = () => {
        requireAuth(() => {
            router.push("/create");
        });
    };

    /*
     * 로그인 안내 모달에서
     * 직접 입력을 선택한 경우
     */
    const handleDirectInputFromLoginModal = () => {
        closeLoginRequired();

        router.push("/create-manual");
    };

    return (
        <>
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
                            /*
                             * [개발용]
                             *
                             * 로그인 상태에서
                             * 닉네임 클릭 시 로그아웃
                             *
                             * 실제 출시 전에는
                             * handleLogoutForTest 연결을 제거합니다.
                             */
                            <Pressable
                                onPress={handleLogoutForTest}
                                hitSlop={10}
                            >
                                <Text style={styles.loginText}>
                                    {session.user.user_metadata
                                        .nickname ?? "NAVI"}
                                </Text>
                            </Pressable>
                        )}

                        {/*
                         * + 버튼은 직접 일정 입력
                         */}
                        <Pressable
                            onPress={handleManualInput}
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
                            onPress={handleManualInput}
                        >
                            <Text
                                style={
                                    styles.guestBannerText
                                }
                            >
                                일정을 입력해 시작하세요
                            </Text>

                            <Text
                                style={
                                    styles.guestBannerArrow
                                }
                            >
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
                            selected={
                                selectedFilter === "전체"
                            }
                            onPress={() =>
                                setSelectedFilter("전체")
                            }
                        />

                        <FilterButton
                            title="오전"
                            selected={
                                selectedFilter === "오전"
                            }
                            onPress={() =>
                                setSelectedFilter("오전")
                            }
                        />

                        <FilterButton
                            title="오후"
                            selected={
                                selectedFilter === "오후"
                            }
                            onPress={() =>
                                setSelectedFilter("오후")
                            }
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
                                onPress={handleManualInput}
                            >
                                <Text
                                    style={
                                        styles.addButtonText
                                    }
                                >
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
                            {filteredSchedules.map(
                                (schedule) => (
                                    <ScheduleCard
                                        key={schedule.id}
                                        title={
                                            schedule.title
                                        }
                                        time={
                                            schedule.time
                                        }
                                        status={
                                            schedule.status
                                        }
                                        completed={
                                            schedule.completed
                                        }
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
                                )
                            )}
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
                            onPress={handleVoiceInput}
                        />

                        <BottomTab
                            icon="settings-outline"
                            label="설정"
                        />
                    </View>
                </View>
            </SafeAreaView>

            <LoginRequiredModal
                visible={loginRequiredVisible}
                onClose={closeLoginRequired}
                onDirectInput={
                    handleDirectInputFromLoginModal
                }
                onLogin={goToLogin}
            />
        </>
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
                selected &&
                styles.filterButtonSelected,
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.filterText,
                    selected &&
                    styles.filterTextSelected,
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
    onPress?: () => void;
};

function BottomTab({
                       icon,
                       label,
                       onPress,
                   }: BottomTabProps) {
    return (
        <Pressable
            style={styles.bottomTab}
            onPress={onPress}
        >
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