import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    router,
    useFocusEffect,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    cancelScheduledNotificationAsync,
} from "expo-notifications/build/cancelScheduledNotificationAsync";

import { Colors } from "@/constants/colors";
import { STORAGE_KEYS } from "@/constants/storageKeys";

import { supabase } from "@/lib/supabase";

import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";

import { ScheduleCard } from "@/components/home/ScheduleCard";
import { ScheduleInfoModal } from "@/components/home/ScheduleInfoModal";

import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { AppErrorScreen } from "@/components/ui/AppErrorScreen";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";

/*
 * =====================================================
 * 타입
 * =====================================================
 */

type RepeatType =
    | "none"
    | "daily"
    | "weekday"
    | "weekly";

type ScheduleStatus =
    | "pending"
    | "completed"
    | "failed";

type LocalSchedule = {
    id: string;

    /*
     * 같은 반복 일정 그룹을 식별하는 ID입니다.
     *
     * 반복 없음:
     * null
     *
     * 반복 일정:
     * 같은 반복 묶음끼리 동일한 seriesId 사용
     */
    seriesId?: string | null;

    title: string;

    memo?: string | null;

    scheduledAt: string;

    repeatType?: RepeatType;

    status: ScheduleStatus;

    completed: boolean;

    reminderMinutes?:
        number | null;

    localNotificationId?:
        string | null;
};

type HomeScheduleTestState =
    | "real"
    | "empty"
    | "with-data";

/*
 * =====================================================
 * 날짜
 * =====================================================
 */

const WEEKDAYS = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
];

function createTodayDate(
    hour: number,
    minute: number
) {
    const date =
        new Date();

    date.setHours(
        hour,
        minute,
        0,
        0
    );

    return date;
}

/*
 * =====================================================
 * [개발용 테스트 데이터]
 * =====================================================
 */

const TEST_SCHEDULES:
    LocalSchedule[] = [
    {
        id: "test-1",

        seriesId:
            null,

        title: "회의 준비",

        memo:
            "회의 자료 확인",

        scheduledAt:
            createTodayDate(
                10,
                0
            ).toISOString(),

        repeatType:
            "none",

        status:
            "pending",

        completed:
            false,

        reminderMinutes:
            10,

        localNotificationId:
            null,
    },

    {
        id: "test-2",

        seriesId:
            "test-series-1",

        title: "책 읽기",

        memo:
            "30페이지 읽기",

        scheduledAt:
            createTodayDate(
                20,
                0
            ).toISOString(),

        repeatType:
            "daily",

        status:
            "completed",

        completed:
            true,

        reminderMinutes:
            30,

        localNotificationId:
            null,
    },

    {
        id: "test-3",

        seriesId:
            null,

        title:
            "택배 보내기",

        memo:
            null,

        scheduledAt:
            createTodayDate(
                21,
                30
            ).toISOString(),

        repeatType:
            "none",

        status:
            "failed",

        completed:
            false,

        reminderMinutes:
            null,

        localNotificationId:
            null,
    },
];

function getTodayText() {
    const today =
        new Date();

    const month =
        today.getMonth() +
        1;

    const date =
        today.getDate();

    const day =
        WEEKDAYS[
            today.getDay()
            ];

    return `${month}월 ${date}일 ${day}`;
}

/*
 * =====================================================
 * Storage
 * =====================================================
 */

function getScheduleStorageKey(
    userId?: string
) {
    return `${STORAGE_KEYS.localSchedulesPrefix}:${
        userId ?? "guest"
    }`;
}

/*
 * =====================================================
 * 기존 일정 데이터 보정
 * =====================================================
 */

function normalizeSchedule(
    schedule:
    LocalSchedule
): LocalSchedule {
    const normalizedStatus:
        ScheduleStatus =
        schedule.status ??
        (
            schedule.completed
                ? "completed"
                : "pending"
        );

    return {
        ...schedule,

        seriesId:
            schedule.seriesId ??
            null,

        repeatType:
            schedule.repeatType ??
            "none",

        status:
        normalizedStatus,

        completed:
            normalizedStatus ===
            "completed",
    };
}

/*
 * =====================================================
 * 일정 데이터 처리
 * =====================================================
 */

function isTodaySchedule(
    schedule:
    LocalSchedule
) {
    const scheduledDate =
        new Date(
            schedule.scheduledAt
        );

    const today =
        new Date();

    return (
        scheduledDate.getFullYear() ===
        today.getFullYear() &&

        scheduledDate.getMonth() ===
        today.getMonth() &&

        scheduledDate.getDate() ===
        today.getDate()
    );
}

function getSchedulePeriod(
    schedule:
    LocalSchedule
):
    | "오전"
    | "오후" {
    const hour =
        new Date(
            schedule.scheduledAt
        ).getHours();

    return hour < 12
        ? "오전"
        : "오후";
}

function formatScheduleTime(
    scheduledAt: string
) {
    const date =
        new Date(
            scheduledAt
        );

    const hour =
        date.getHours();

    const minute =
        date.getMinutes();

    const period =
        hour < 12
            ? "오전"
            : "오후";

    const displayHour =
        hour % 12 === 0
            ? 12
            : hour % 12;

    return `${period} ${displayHour}:${String(
        minute
    ).padStart(
        2,
        "0"
    )}`;
}

/*
 * =====================================================
 * [개발용 Home 일정 상태 테스트]
 * =====================================================
 */

function getHomeScheduleTestState():
    HomeScheduleTestState {
    return "real";
}

const HOME_SCHEDULE_STATE_FOR_TEST =
    getHomeScheduleTestState();

/*
 * =====================================================
 * Screen
 * =====================================================
 */

export default function HomeScreen() {
    const todayText =
        getTodayText();

    const {
        session,
        loading,
        error:
            authError,
        retry:
            retryAuth,
    } =
        useAuth();

    const {
        requireAuth,

        loginRequiredVisible,

        closeLoginRequired,

        goToLogin,
    } =
        useRequireAuth();

    const [
        checkingPermissionOnboarding,
        setCheckingPermissionOnboarding,
    ] =
        useState(
            true
        );

    const [
        loadingSchedules,
        setLoadingSchedules,
    ] =
        useState(
            true
        );

    const [
        schedules,
        setSchedules,
    ] =
        useState<
            LocalSchedule[]
        >(
            []
        );

    const [
        selectedFilter,
        setSelectedFilter,
    ] =
        useState<
            | "전체"
            | "오전"
            | "오후"
        >(
            "전체"
        );

    /*
     * =====================================================
     * 일정 정보 Popup
     * =====================================================
     */

    const [
        selectedSchedule,
        setSelectedSchedule,
    ] =
        useState<
            LocalSchedule | null
        >(
            null
        );

    const [
        scheduleInfoVisible,
        setScheduleInfoVisible,
    ] =
        useState(
            false
        );

    /*
     * =====================================================
     * 권한 온보딩
     * =====================================================
     */

    useEffect(
        () => {
            let mounted =
                true;

            const checkPermissionOnboarding =
                async () => {
                    try {
                        const completed =
                            await AsyncStorage.getItem(
                                STORAGE_KEYS
                                    .permissionOnboardingCompleted
                            );

                        if (
                            !mounted
                        ) {
                            return;
                        }

                        if (
                            completed !==
                            "true"
                        ) {
                            router.replace(
                                "/permissions"
                            );

                            return;
                        }

                        setCheckingPermissionOnboarding(
                            false
                        );
                    } catch (
                        error
                        ) {
                        console.error(
                            "권한 온보딩 상태 확인 오류:",
                            error
                        );

                        if (
                            mounted
                        ) {
                            setCheckingPermissionOnboarding(
                                false
                            );
                        }
                    }
                };

            void checkPermissionOnboarding();

            return () => {
                mounted =
                    false;
            };
        },
        []
    );

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
     * ⚠️ 실제 출시 전에는 이 블록 전체를 삭제합니다.
     * =====================================================
     */

    const FORCE_ERROR_SCREEN_FOR_TEST =
        false;

    /*
     * [개발용 테스트 코드]
     *
     * 비회원 상태 테스트를 위한 임시 로그아웃 기능입니다.
     *
     * ⚠️ 실제 출시 전에는 이 블록 전체를 삭제합니다.
     */
    const handleLogoutForTest =
        async () => {
            const {
                error,
            } =
                await supabase
                    .auth
                    .signOut();

            if (
                error
            ) {
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
     * =====================================================
     * 일정 저장 공통 함수
     * =====================================================
     */

    const saveSchedules =
        async (
            nextSchedules:
            LocalSchedule[]
        ) => {
            const storageKey =
                getScheduleStorageKey(
                    session
                        ?.user
                        .id
                );

            await AsyncStorage.setItem(
                storageKey,
                JSON.stringify(
                    nextSchedules
                )
            );

            setSchedules(
                nextSchedules
            );
        };

    /*
     * =====================================================
     * 일정 로드
     * =====================================================
     */

    const loadSchedules =
        useCallback(
            async () => {
                setLoadingSchedules(
                    true
                );

                try {
                    if (
                        HOME_SCHEDULE_STATE_FOR_TEST ===
                        "empty"
                    ) {
                        setSchedules(
                            []
                        );

                        return;
                    }

                    if (
                        HOME_SCHEDULE_STATE_FOR_TEST ===
                        "with-data"
                    ) {
                        setSchedules(
                            TEST_SCHEDULES
                        );

                        return;
                    }

                    const storageKey =
                        getScheduleStorageKey(
                            session
                                ?.user
                                .id
                        );

                    const storedSchedules =
                        await AsyncStorage.getItem(
                            storageKey
                        );

                    if (
                        !storedSchedules
                    ) {
                        setSchedules(
                            []
                        );

                        return;
                    }

                    const parsedSchedules =
                        JSON.parse(
                            storedSchedules
                        );

                    if (
                        !Array.isArray(
                            parsedSchedules
                        )
                    ) {
                        setSchedules(
                            []
                        );

                        return;
                    }

                    const normalizedSchedules:
                        LocalSchedule[] =
                        parsedSchedules.map(
                            (
                                schedule
                            ) =>
                                normalizeSchedule(
                                    schedule
                                )
                        );

                    setSchedules(
                        normalizedSchedules
                    );

                    setSelectedSchedule(
                        (
                            current
                        ) => {
                            if (
                                !current
                            ) {
                                return null;
                            }

                            return (
                                normalizedSchedules.find(
                                    (
                                        schedule
                                    ) =>
                                        schedule.id ===
                                        current.id
                                ) ??
                                null
                            );
                        }
                    );
                } catch (
                    error
                    ) {
                    console.error(
                        "로컬 일정 불러오기 오류:",
                        error
                    );

                    setSchedules(
                        []
                    );
                } finally {
                    setLoadingSchedules(
                        false
                    );
                }
            },
            [
                session
                    ?.user
                    .id,
            ]
        );

    useFocusEffect(
        useCallback(
            () => {
                void loadSchedules();
            },
            [
                loadSchedules,
            ]
        )
    );

    /*
     * =====================================================
     * 오늘 일정
     * =====================================================
     */

    const todaySchedules =
        schedules
            .filter(
                isTodaySchedule
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        a.scheduledAt
                    ).getTime() -
                    new Date(
                        b.scheduledAt
                    ).getTime()
            );

    const filteredSchedules =
        selectedFilter ===
        "전체"
            ? todaySchedules
            : todaySchedules.filter(
                (
                    schedule
                ) =>
                    getSchedulePeriod(
                        schedule
                    ) ===
                    selectedFilter
            );

    const scheduleCount =
        todaySchedules.length;

    /*
     * =====================================================
     * 일정 정보 Popup
     * =====================================================
     */

    const handleSchedulePress =
        (
            schedule:
            LocalSchedule
        ) => {
            console.log(
                "일정 선택:",
                schedule.id
            );

            setSelectedSchedule(
                schedule
            );

            setScheduleInfoVisible(
                true
            );
        };

    const closeScheduleInfo =
        () => {
            setScheduleInfoVisible(
                false
            );
        };

    /*
     * =====================================================
     * 일정 수정 화면 이동
     * =====================================================
     */

    const goToScheduleEdit =
        (
            schedule:
            LocalSchedule,
            editScope:
                | "single"
                | "future"
        ) => {
            setScheduleInfoVisible(
                false
            );

            router.push({
                pathname:
                    "/schedule-edit",

                params: {
                    scheduleId:
                    schedule.id,

                    editScope,
                },
            });
        };

    /*
     * =====================================================
     * 일정 수정
     *
     * 일반 일정
     * → 바로 수정 화면 이동
     *
     * 반복 일정
     * → 수정 범위 선택
     * =====================================================
     */

    const handleEditSchedule =
        (
            schedule:
            LocalSchedule
        ) => {
            console.log(
                "일정 수정 선택:",
                schedule.id
            );

            const isRepeatSchedule =
                schedule.repeatType !==
                "none" &&
                Boolean(
                    schedule.seriesId
                );

            if (
                !isRepeatSchedule
            ) {
                goToScheduleEdit(
                    schedule,
                    "single"
                );

                return;
            }

            Alert.alert(
                "반복 일정 수정",
                "수정할 일정의 범위를 선택해 주세요.",
                [
                    {
                        text:
                            "취소",

                        style:
                            "cancel",
                    },

                    {
                        text:
                            "이 일정만 수정",

                        onPress:
                            () => {
                                goToScheduleEdit(
                                    schedule,
                                    "single"
                                );
                            },
                    },

                    {
                        text:
                            "이 일정 및 이후 일정",

                        onPress:
                            () => {
                                goToScheduleEdit(
                                    schedule,
                                    "future"
                                );
                            },
                    },
                ]
            );
        };

    /*
     * =====================================================
     * 왼쪽 Swipe
     *
     * pending   → completed
     * completed → pending
     * failed    → pending
     * =====================================================
     */

    const handleToggleSchedule =
        async (
            schedule:
            LocalSchedule
        ) => {
            let nextStatus:
                ScheduleStatus;

            if (
                schedule.status ===
                "pending"
            ) {
                nextStatus =
                    "completed";
            } else {
                nextStatus =
                    "pending";
            }

            const nextCompleted =
                nextStatus ===
                "completed";

            const updatedSchedule:
                LocalSchedule = {
                ...schedule,

                status:
                nextStatus,

                completed:
                nextCompleted,
            };

            const nextSchedules =
                schedules.map(
                    (
                        item
                    ) =>
                        item.id ===
                        schedule.id
                            ? updatedSchedule
                            : item
                );

            try {
                await saveSchedules(
                    nextSchedules
                );

                if (
                    selectedSchedule?.id ===
                    schedule.id
                ) {
                    setSelectedSchedule(
                        updatedSchedule
                    );
                }

                console.log(
                    "일정 상태 변경 완료:",
                    {
                        scheduleId:
                        schedule.id,

                        previousStatus:
                        schedule.status,

                        nextStatus,
                    }
                );
            } catch (
                error
                ) {
                console.error(
                    "일정 상태 변경 오류:",
                    error
                );

                Alert.alert(
                    "상태를 변경하지 못했어요",
                    "잠시 후 다시 시도해 주세요."
                );
            }
        };

    /*
     * =====================================================
     * 오른쪽 Swipe
     *
     * pending   → failed
     * completed → failed
     * failed    → 변화 없음
     * =====================================================
     */

    const handleFailSchedule =
        async (
            schedule:
            LocalSchedule
        ) => {
            if (
                schedule.status ===
                "failed"
            ) {
                return;
            }

            const updatedSchedule:
                LocalSchedule = {
                ...schedule,

                status:
                    "failed",

                completed:
                    false,
            };

            const nextSchedules =
                schedules.map(
                    (
                        item
                    ) =>
                        item.id ===
                        schedule.id
                            ? updatedSchedule
                            : item
                );

            try {
                await saveSchedules(
                    nextSchedules
                );

                if (
                    selectedSchedule?.id ===
                    schedule.id
                ) {
                    setSelectedSchedule(
                        updatedSchedule
                    );
                }

                console.log(
                    "일정 실패 처리 완료:",
                    schedule.id
                );
            } catch (
                error
                ) {
                console.error(
                    "일정 실패 처리 오류:",
                    error
                );

                Alert.alert(
                    "상태를 변경하지 못했어요",
                    "잠시 후 다시 시도해 주세요."
                );
            }
        };

    /*
     * =====================================================
     * 일정 삭제
     *
     * Swipe에서는 삭제하지 않습니다.
     *
     * 일정 상세 Popup의
     * "삭제하기" 버튼에서만 호출합니다.
     * =====================================================
     */

    const handleDeleteSchedule =
        async (
            schedule:
            LocalSchedule
        ) => {
            try {
                if (
                    schedule.localNotificationId
                ) {
                    try {
                        await cancelScheduledNotificationAsync(
                            schedule.localNotificationId
                        );

                        console.log(
                            "예약 알림 취소 완료:",
                            schedule.localNotificationId
                        );
                    } catch (
                        notificationError
                        ) {
                        console.error(
                            "예약 알림 취소 오류:",
                            notificationError
                        );
                    }
                }

                const nextSchedules =
                    schedules.filter(
                        (
                            item
                        ) =>
                            item.id !==
                            schedule.id
                    );

                await saveSchedules(
                    nextSchedules
                );

                setScheduleInfoVisible(
                    false
                );

                setSelectedSchedule(
                    null
                );

                console.log(
                    "일정 삭제 완료:",
                    schedule.id
                );
            } catch (
                error
                ) {
                console.error(
                    "일정 삭제 오류:",
                    error
                );

                Alert.alert(
                    "일정을 삭제하지 못했어요",
                    "잠시 후 다시 시도해 주세요."
                );
            }
        };

    /*
     * =====================================================
     * 개발용 오류 화면
     * =====================================================
     */

    if (
        FORCE_ERROR_SCREEN_FOR_TEST
    ) {
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
     * =====================================================
     * Loading
     * =====================================================
     */

    if (
        loading ||
        checkingPermissionOnboarding ||
        loadingSchedules
    ) {
        return (
            <AppLoadingScreen />
        );
    }

    if (
        authError
    ) {
        return (
            <AppErrorScreen
                message={
                    authError
                }
                onRetry={
                    retryAuth
                }
            />
        );
    }

    /*
     * =====================================================
     * Navigation
     * =====================================================
     */

    const handleLogin =
        () => {
            router.push(
                "/auth/login"
            );
        };

    const handleManualInput =
        () => {
            router.push(
                "/create-manual"
            );
        };

    const handleVoiceInput =
        () => {
            requireAuth(
                () => {
                    router.push(
                        "/create"
                    );
                }
            );
        };

    const handleDirectInputFromLoginModal =
        () => {
            closeLoginRequired();

            router.push(
                "/create-manual"
            );
        };

    /*
     * =====================================================
     * UI
     * =====================================================
     */

    return (
        <>
            <SafeAreaView
                style={
                    styles.safeArea
                }
            >
                <View
                    style={
                        styles.container
                    }
                >
                    <View
                        style={
                            styles.topBar
                        }
                    >
                        {!session ? (
                            <Pressable
                                onPress={
                                    handleLogin
                                }
                                hitSlop={10}
                            >
                                <Text
                                    style={
                                        styles.loginText
                                    }
                                >
                                    로그인
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={
                                    handleLogoutForTest
                                }
                                hitSlop={10}
                            >
                                <Text
                                    style={
                                        styles.loginText
                                    }
                                >
                                    {session
                                            .user
                                            .user_metadata
                                            .nickname ??
                                        "NAVI"}
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={
                                handleManualInput
                            }
                            hitSlop={10}
                        >
                            <Ionicons
                                name="add-outline"
                                size={32}
                                color="#111111"
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={
                            styles.homeScroll
                        }
                        contentContainerStyle={
                            styles.homeScrollContent
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        <View
                            style={
                                styles.dateArea
                            }
                        >
                            <Text
                                style={
                                    styles.dateText
                                }
                            >
                                {
                                    todayText
                                }
                            </Text>

                            <Text
                                style={
                                    styles.subText
                                }
                            >
                                오늘도 차근차근 해볼까요?
                            </Text>
                        </View>

                        {!session && (
                            <Pressable
                                style={
                                    styles.guestBanner
                                }
                                onPress={
                                    handleManualInput
                                }
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

                        <View
                            style={
                                styles.scheduleHeader
                            }
                        >
                            <Text
                                style={
                                    styles.scheduleTitle
                                }
                            >
                                오늘의 할 일{" "}
                                {
                                    scheduleCount
                                }
                            </Text>

                            <Text
                                style={
                                    styles.deviceText
                                }
                            >
                                이 기기에 저장된 일정
                            </Text>
                        </View>

                        {scheduleCount >
                            0 && (
                                <View
                                    style={
                                        styles.filterRow
                                    }
                                >
                                    <FilterButton
                                        title="전체"
                                        selected={
                                            selectedFilter ===
                                            "전체"
                                        }
                                        onPress={() =>
                                            setSelectedFilter(
                                                "전체"
                                            )
                                        }
                                    />

                                    <FilterButton
                                        title="오전"
                                        selected={
                                            selectedFilter ===
                                            "오전"
                                        }
                                        onPress={() =>
                                            setSelectedFilter(
                                                "오전"
                                            )
                                        }
                                    />

                                    <FilterButton
                                        title="오후"
                                        selected={
                                            selectedFilter ===
                                            "오후"
                                        }
                                        onPress={() =>
                                            setSelectedFilter(
                                                "오후"
                                            )
                                        }
                                    />
                                </View>
                            )}

                        {scheduleCount ===
                        0 ? (
                            <View
                                style={
                                    styles.emptyArea
                                }
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={48}
                                    color="#C3C5CA"
                                />

                                <Text
                                    style={
                                        styles.emptyText
                                    }
                                >
                                    아직 등록한 일정이 없어요.
                                </Text>

                                {session && (
                                    <Pressable
                                        style={
                                            styles.addButton
                                        }
                                        onPress={
                                            handleManualInput
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.addButtonText
                                            }
                                        >
                                            일정 직접 추가
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : filteredSchedules.length ===
                        0 ? (
                            <View
                                style={
                                    styles.filteredEmptyArea
                                }
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={44}
                                    color="#C3C5CA"
                                />

                                <Text
                                    style={
                                        styles.emptyText
                                    }
                                >
                                    해당 시간대에 일정이 없어요.
                                </Text>
                            </View>
                        ) : (
                            <View
                                style={
                                    styles.scheduleList
                                }
                            >
                                {filteredSchedules.map(
                                    (
                                        schedule
                                    ) => (
                                        <ScheduleCard
                                            key={
                                                schedule.id
                                            }
                                            title={
                                                schedule.title
                                            }
                                            time={
                                                formatScheduleTime(
                                                    schedule.scheduledAt
                                                )
                                            }
                                            status={
                                                schedule.status
                                            }
                                            onPress={() =>
                                                handleSchedulePress(
                                                    schedule
                                                )
                                            }
                                            onToggle={() =>
                                                void handleToggleSchedule(
                                                    schedule
                                                )
                                            }
                                            onFail={() =>
                                                void handleFailSchedule(
                                                    schedule
                                                )
                                            }
                                        />
                                    )
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View
                        style={
                            styles.bottomNavigation
                        }
                    >
                        <BottomTab
                            icon="calendar-outline"
                            label="캘린더"
                        />

                        <BottomTab
                            icon="mic-outline"
                            label="음성 입력"
                            onPress={
                                handleVoiceInput
                            }
                        />

                        <BottomTab
                            icon="settings-outline"
                            label="설정"
                        />
                    </View>
                </View>
            </SafeAreaView>

            <LoginRequiredModal
                visible={
                    loginRequiredVisible
                }
                onClose={
                    closeLoginRequired
                }
                onDirectInput={
                    handleDirectInputFromLoginModal
                }
                onLogin={
                    goToLogin
                }
            />

            <ScheduleInfoModal
                visible={
                    scheduleInfoVisible
                }
                schedule={
                    selectedSchedule
                }
                onClose={
                    closeScheduleInfo
                }
                onEdit={
                    handleEditSchedule
                }
                onDelete={(
                    schedule
                ) => {
                    void handleDeleteSchedule(
                        schedule
                    );
                }}
            />
        </>
    );
}

/*
 * =====================================================
 * Filter Button
 * =====================================================
 */

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
            onPress={
                onPress
            }
        >
            <Text
                style={[
                    styles.filterText,

                    selected &&
                    styles.filterTextSelected,
                ]}
            >
                {
                    title
                }
            </Text>
        </Pressable>
    );
}

/*
 * =====================================================
 * Bottom Tab
 * =====================================================
 */

type BottomTabProps = {
    icon:
        | "calendar-outline"
        | "mic-outline"
        | "settings-outline";

    label: string;

    onPress?:
        () => void;
};

function BottomTab({
                       icon,
                       label,
                       onPress,
                   }: BottomTabProps) {
    return (
        <Pressable
            style={
                styles.bottomTab
            }
            onPress={
                onPress
            }
        >
            <Ionicons
                name={
                    icon
                }
                size={27}
                color="#111111"
            />

            <Text
                style={
                    styles.bottomTabText
                }
            >
                {
                    label
                }
            </Text>
        </Pressable>
    );
}

/*
 * =====================================================
 * Styles
 * =====================================================
 */

const styles =
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor:
            Colors.background,
        },

        container: {
            flex: 1,
            backgroundColor:
                "#FFFFFF",
        },

        topBar: {
            height: 70,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            backgroundColor:
                "#FFFFFF",
        },

        loginText: {
            fontSize: 18,
            fontWeight: "600",
            color: "#111111",
        },

        homeScroll: {
            flex: 1,
        },

        homeScrollContent: {
            paddingBottom: 32,
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
            backgroundColor:
                "#FFF4F4",
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
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
            justifyContent:
                "space-between",
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
            borderColor:
                "#E0E1E5",
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                "#F8F8F9",
        },

        filterButtonSelected: {
            backgroundColor:
                "#111111",
            borderColor:
                "#111111",
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
            paddingHorizontal: 24,
            paddingTop: 24,
            gap: 12,
        },

        emptyArea: {
            minHeight: 380,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 60,
        },

        filteredEmptyArea: {
            minHeight: 260,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
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
            backgroundColor:
                "#111111",
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
            borderTopColor:
                "#E5E5E5",
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-around",
            backgroundColor:
                "#FFFFFF",
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