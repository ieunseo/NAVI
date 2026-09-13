import {
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


/*
 * =====================================================
 * 타입
 * =====================================================
 */


/*
 * Home에서 사용하는 로컬 일정 타입
 *
 * 추후 Supabase tasks 테이블 연동 시
 * 서버 데이터를 이 형태로 변환해서 사용할 수 있습니다.
 */
type LocalSchedule = {
    id: string;

    title: string;

    /*
     * 기존에 저장된 일정에는 memo가 없을 수 있으므로
     * optional로 처리합니다.
     */
    memo?: string | null;

    scheduledAt: string;

    status:
        | "pending"
        | "completed"
        | "failed";

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


/*
 * =====================================================
 * [개발용 테스트 데이터]
 *
 * Home의 "일정 있음" 상태 확인용 데이터입니다.
 *
 * 실제 출시 전에는
 * 개발용 테스트 영역과 함께 삭제합니다.
 * =====================================================
 */

const TEST_SCHEDULES:
    LocalSchedule[] = [
    {
        id:
            "test-1",

        title:
            "회의 준비",

        memo:
            "회의 자료 확인",

        scheduledAt:
            createTodayDate(
                10,
                0
            ).toISOString(),

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
        id:
            "test-2",

        title:
            "책 읽기",

        memo:
            null,

        scheduledAt:
            createTodayDate(
                20,
                0
            ).toISOString(),

        status:
            "pending",

        completed:
            false,

        reminderMinutes:
            null,

        localNotificationId:
            null,
    },
];


/*
 * 오늘 날짜 기준으로
 * 테스트용 시간을 생성합니다.
 */
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
 * Home 상단 날짜 문자열
 */
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


/*
 * 현재 사용자에 맞는
 * 로컬 일정 저장 Key를 생성합니다.
 *
 * 비회원:
 * navi_local_schedules:guest
 *
 * 회원:
 * navi_local_schedules:{userId}
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
 * 일정 데이터 처리
 * =====================================================
 */


/*
 * 해당 일정이 오늘 일정인지 확인합니다.
 */
function isTodaySchedule(
    schedule: LocalSchedule
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


/*
 * 일정 시간을
 * 오전 / 오후로 구분합니다.
 */
function getSchedulePeriod(
    schedule: LocalSchedule
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


/*
 * ISO 날짜를
 * Home 카드용 오전/오후 시간 문자열로 변환합니다.
 */
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
 * 일정 status 값을
 * Home 표시 문자열로 변환합니다.
 */
function getScheduleStatusText(
    schedule: LocalSchedule
) {
    if (
        schedule.completed ||
        schedule.status ===
        "completed"
    ) {
        return "완료";
    }


    if (
        schedule.status ===
        "failed"
    ) {
        return "실패";
    }


    return "대기";
}


/*
 * =====================================================
 * [개발용 Home 일정 상태 테스트]
 *
 * "real"
 * → 실제 AsyncStorage 일정 사용
 *
 * "empty"
 * → 강제로 일정 0개
 *
 * "with-data"
 * → TEST_SCHEDULES 표시
 *
 * TypeScript가 "real" 하나로 타입을 좁히는 것을
 * 방지하기 위해 함수 반환값으로 사용합니다.
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


    /*
     * 회원 전용 기능 접근 시
     * 로그인 여부를 확인하기 위한 공통 Hook
     */
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


    /*
     * 로컬 일정 로딩 여부
     */
    const [
        loadingSchedules,
        setLoadingSchedules,
    ] =
        useState(
            true
        );


    /*
     * 현재 사용자 / 비회원의
     * 로컬 일정 목록
     */
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
     * 권한 온보딩
     * =====================================================
     */


    /*
     * 최초 앱 진입 시 권한 온보딩 완료 여부 확인
     *
     * permission_onboarding_completed 값이 없으면
     * 아직 권한 안내를 완료하지 않은 사용자이므로
     * permissions 화면으로 이동합니다.
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


                        /*
                         * AsyncStorage 확인에 실패했다고 해서
                         * 앱 사용 자체를 막지는 않습니다.
                         */
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
     * 평소 개발 시 false로 두고,
     * 오류 화면 UI 확인이 필요할 때만 true로 변경합니다.
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
     * 로그인 상태에서 왼쪽 상단 닉네임을 누르면
     * 현재 Supabase Session을 로그아웃합니다.
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
     * 일정 로드
     * =====================================================
     */


    /*
     * 현재 사용자에 맞는 로컬 일정을 불러옵니다.
     *
     * session 없음
     * → guest 일정
     *
     * session 있음
     * → 해당 user.id 전용 일정
     *
     * 로그인 / 로그아웃으로 session이 변경될 때마다
     * 자동으로 다시 불러옵니다.
     */
    const loadSchedules =
        useCallback(
            async () => {
                setLoadingSchedules(
                    true
                );


                try {
                    /*
                     * 개발용 강제 Empty State
                     */
                    if (
                        HOME_SCHEDULE_STATE_FOR_TEST ===
                        "empty"
                    ) {
                        setSchedules(
                            []
                        );

                        return;
                    }


                    /*
                     * 개발용 강제 일정 있음 상태
                     */
                    if (
                        HOME_SCHEDULE_STATE_FOR_TEST ===
                        "with-data"
                    ) {
                        setSchedules(
                            TEST_SCHEDULES
                        );

                        return;
                    }


                    /*
                     * 실제 앱 흐름
                     */
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
                        ) as LocalSchedule[];


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


                    setSchedules(
                        parsedSchedules
                    );
                } catch (
                    error
                    ) {
                    console.error(
                        "로컬 일정 불러오기 오류:",
                        error
                    );


                    /*
                     * 로컬 일정 읽기 실패 시
                     * Home 자체를 막지 않고
                     * Empty State로 표시합니다.
                     */
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


    useEffect(
        () => {
            void loadSchedules();
        },
        [
            loadSchedules,
        ]
    );


    /*
     * 오늘 일정만 Home에 표시합니다.
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


    /*
     * 오전 / 오후 필터 적용
     */
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


    /*
     * Supabase Session 복구 /
     * 권한 온보딩 상태 /
     * 로컬 일정 로딩 중에는
     * Loading 화면을 표시합니다.
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


    /*
     * Supabase Auth 초기화 중 오류가 발생한 경우
     * 오류 화면을 표시하고 다시 시도할 수 있게 합니다.
     */
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


    /*
     * 직접 일정 입력
     *
     * 비회원 / 회원 모두
     * 직접 입력은 사용할 수 있습니다.
     */
    const handleManualInput =
        () => {
            router.push(
                "/create-manual"
            );
        };


    /*
     * AI 음성 입력
     *
     * 현재 단계:
     *
     * 비회원
     * → 로그인 안내 모달
     *
     * 로그인 회원
     * → /create
     *
     * 추후 user_access 연동 시:
     *
     * 무료회원
     * → 구독 안내
     *
     * 유료회원
     * → /create
     */
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


    /*
     * 로그인 안내 모달에서
     * 직접 입력을 선택한 경우
     */
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
                    {/*
                     * =====================================================
                     * 상단 고정 영역
                     * =====================================================
                     */}

                    <View
                        style={
                            styles.topBar
                        }
                    >
                        {!session ? (
                            /*
                             * 비회원 상태
                             */
                            <Pressable
                                onPress={
                                    handleLogin
                                }
                                hitSlop={
                                    10
                                }
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
                            /*
                             * 회원 상태
                             *
                             * 현재 개발 중에는
                             * 닉네임 클릭 시 로그아웃됩니다.
                             */
                            <Pressable
                                onPress={
                                    handleLogoutForTest
                                }
                                hitSlop={
                                    10
                                }
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
                            hitSlop={
                                10
                            }
                        >
                            <Ionicons
                                name="add-outline"
                                size={
                                    32
                                }
                                color="#111111"
                            />
                        </Pressable>
                    </View>


                    {/*
                     * =====================================================
                     * Home Scroll 영역
                     *
                     * 날짜 / 게스트 배너 / 일정 헤더 /
                     * 필터 / 일정 목록이 모두 함께 스크롤됩니다.
                     *
                     * 상단 Bar와 하단 Navigation은 고정됩니다.
                     * =====================================================
                     */}

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
                        {/* 날짜 */}
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


                        {/* 비회원 전용 배너 */}
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


                        {/* 일정 헤더 */}
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


                        {/* 일정이 있는 경우에만 필터 표시 */}
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


                        {/* 일정 없음 */}
                        {scheduleCount ===
                        0 ? (
                            <View
                                style={
                                    styles.emptyArea
                                }
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={
                                        48
                                    }
                                    color="#C3C5CA"
                                />


                                <Text
                                    style={
                                        styles.emptyText
                                    }
                                >
                                    아직 등록한 일정이 없어요.
                                </Text>


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
                            </View>
                        ) : filteredSchedules.length ===
                        0 ? (
                            /*
                             * 일정은 존재하지만
                             * 선택한 오전/오후 시간대에는 없는 경우
                             */
                            <View
                                style={
                                    styles.filteredEmptyArea
                                }
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={
                                        44
                                    }
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
                            /*
                             * 일정 있음
                             */
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
                                                getScheduleStatusText(
                                                    schedule
                                                )
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
                    </ScrollView>


                    {/*
                     * =====================================================
                     * 하단 Navigation 고정
                     * =====================================================
                     */}

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


            {/*
             * 비회원이 음성 입력을 선택했을 때
             * 표시하는 로그인 안내 모달
             */}
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
    title:
        string;

    selected:
        boolean;

    onPress:
        () => void;
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

    label:
        string;

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
                size={
                    27
                }
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
            flex:
                1,

            backgroundColor:
            Colors.background,
        },


        container: {
            flex:
                1,

            backgroundColor:
                "#FFFFFF",
        },


        /*
         * =====================================================
         * 상단 고정 영역
         * =====================================================
         */

        topBar: {
            height:
                70,

            paddingHorizontal:
                24,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            backgroundColor:
                "#FFFFFF",
        },


        loginText: {
            fontSize:
                18,

            fontWeight:
                "600",

            color:
                "#111111",
        },


        /*
         * =====================================================
         * Scroll 영역
         * =====================================================
         */

        homeScroll: {
            flex:
                1,
        },


        homeScrollContent: {
            paddingBottom:
                32,
        },


        dateArea: {
            paddingHorizontal:
                24,

            marginTop:
                16,
        },


        dateText: {
            fontSize:
                28,

            lineHeight:
                38,

            fontWeight:
                "700",

            color:
                "#111111",
        },


        subText: {
            marginTop:
                8,

            fontSize:
                17,

            lineHeight:
                26,

            color:
                "#777B84",
        },


        /*
         * =====================================================
         * 비회원 Banner
         * =====================================================
         */

        guestBanner: {
            marginTop:
                24,

            marginHorizontal:
                24,

            height:
                56,

            paddingHorizontal:
                16,

            borderRadius:
                12,

            backgroundColor:
                "#FFF4F4",

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },


        guestBannerText: {
            fontSize:
                14,

            fontWeight:
                "500",

            color:
                "#444444",
        },


        guestBannerArrow: {
            fontSize:
                22,

            color:
                "#666666",
        },


        /*
         * =====================================================
         * 일정 Header
         * =====================================================
         */

        scheduleHeader: {
            marginTop:
                40,

            paddingHorizontal:
                24,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },


        scheduleTitle: {
            fontSize:
                20,

            fontWeight:
                "700",

            color:
                "#111111",
        },


        deviceText: {
            fontSize:
                13,

            color:
                "#8A8E96",
        },


        /*
         * =====================================================
         * Filter
         * =====================================================
         */

        filterRow: {
            marginTop:
                22,

            paddingHorizontal:
                24,

            flexDirection:
                "row",

            gap:
                12,
        },


        filterButton: {
            minWidth:
                84,

            height:
                42,

            paddingHorizontal:
                20,

            borderWidth:
                1,

            borderColor:
                "#E0E1E5",

            borderRadius:
                22,

            alignItems:
                "center",

            justifyContent:
                "center",

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
            fontSize:
                15,

            color:
                "#52555C",
        },


        filterTextSelected: {
            color:
                "#FFFFFF",

            fontWeight:
                "600",
        },


        /*
         * =====================================================
         * 일정 목록
         *
         * ScrollView 내부이므로
         * flex: 1을 사용하지 않습니다.
         * =====================================================
         */

        scheduleList: {
            paddingHorizontal:
                24,

            paddingTop:
                24,

            gap:
                12,
        },


        /*
         * =====================================================
         * Empty State
         * =====================================================
         */

        emptyArea: {
            minHeight:
                380,

            paddingHorizontal:
                24,

            alignItems:
                "center",

            justifyContent:
                "center",

            paddingBottom:
                60,
        },


        filteredEmptyArea: {
            minHeight:
                260,

            paddingHorizontal:
                24,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        emptyText: {
            marginTop:
                28,

            fontSize:
                16,

            color:
                "#8A8E96",
        },


        addButton: {
            width:
                "100%",

            height:
                56,

            marginTop:
                42,

            borderRadius:
                4,

            backgroundColor:
                "#111111",

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        addButtonText: {
            fontSize:
                17,

            fontWeight:
                "600",

            color:
                "#FFFFFF",
        },


        /*
         * =====================================================
         * 하단 Navigation
         * =====================================================
         */

        bottomNavigation: {
            height:
                94,

            borderTopWidth:
                1,

            borderTopColor:
                "#E5E5E5",

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-around",

            backgroundColor:
                "#FFFFFF",

            paddingBottom:
                8,
        },


        bottomTab: {
            flex:
                1,

            alignItems:
                "center",

            justifyContent:
                "center",

            gap:
                7,
        },


        bottomTabText: {
            fontSize:
                12,

            fontWeight:
                "600",

            color:
                "#111111",
        },
    });