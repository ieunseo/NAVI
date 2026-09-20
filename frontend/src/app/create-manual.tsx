import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";


/*
 * =====================================================
 * Expo Go 대응용 Local Notification 내부 import
 *
 * ⚠️ expo-notifications public import를 사용하면
 * Android Expo Go에서 remote notification 관련 오류가
 * 발생할 수 있어서 Local Notification에 필요한 모듈만
 * 직접 import하고 있습니다.
 *
 * ⚠️ Development Build로 전환한 뒤에는
 * public API 사용으로 되돌리는 것을 권장합니다.
 * =====================================================
 */

import {
    getPermissionsAsync,
    requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";

import {
    setNotificationHandler,
} from "expo-notifications/build/NotificationsHandler";

import {
    scheduleNotificationAsync,
} from "expo-notifications/build/scheduleNotificationAsync";

import {
    SchedulableTriggerInputTypes,
} from "expo-notifications/build/Notifications.types";


import { STORAGE_KEYS } from "../constants/storageKeys";
import { useAuth } from "../hooks/useAuth";


/*
 * =====================================================
 * Local Notification 설정
 * =====================================================
 */

setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});


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
    seriesId:
        string | null;

    title: string;

    memo: string | null;

    scheduledAt: string;

    /*
     * 일정 반복 설정
     *
     * none
     * → 반복 없음
     *
     * daily
     * → 매일 반복
     *
     * weekday
     * → 평일 반복 (월 ~ 금)
     *
     * weekly
     * → 매주 동일 요일 반복
     */
    repeatType: RepeatType;

    status:
        | "pending"
        | "completed"
        | "failed";

    completed: boolean;

    reminderMinutes:
        number | null;

    /*
     * Expo Local Notification 예약 ID
     *
     * 추후 일정 수정 / 삭제 / 완료 시
     * 예약된 알림을 취소할 때 사용합니다.
     */
    localNotificationId:
        string | null;
};


type SelectionModalType =
    | "date"
    | "time"
    | "reminder"
    | "repeat"
    | null;


type DateOption = {
    label: string;
    value: Date;
};


type ReminderOption = {
    label: string;
    value: number | null;
};


type RepeatOption = {
    label: string;
    value: RepeatType;
};


const PERIOD_OPTIONS = [
    "오전",
    "오후",
] as const;


type Period =
    typeof PERIOD_OPTIONS[number];


/*
 * =====================================================
 * 알림 옵션
 * =====================================================
 */

const REMINDER_OPTIONS: ReminderOption[] = [
    {
        label: "알림 없음",
        value: null,
    },

    {
        label: "10분 전",
        value: 10,
    },

    {
        label: "20분 전",
        value: 20,
    },

    {
        label: "30분 전",
        value: 30,
    },

    {
        label: "1시간 전",
        value: 60,
    },

    {
        label: "2시간 전",
        value: 120,
    },
];


/*
 * =====================================================
 * 반복 옵션
 * =====================================================
 */

const REPEAT_OPTIONS: RepeatOption[] = [
    {
        label: "반복 없음",
        value: "none",
    },

    {
        label: "매일",
        value: "daily",
    },

    {
        label: "평일",
        value: "weekday",
    },

    {
        label: "매주",
        value: "weekly",
    },
];


/*
 * =====================================================
 * 시간 Wheel Picker
 * =====================================================
 */

const WHEEL_ITEM_HEIGHT =
    48;


/*
 * 시
 *
 * 1 ~ 12
 */
const HOUR_OPTIONS =
    Array.from(
        {
            length: 12,
        },
        (
            _,
            index
        ) =>
            index + 1
    );


/*
 * 분
 *
 * 00 ~ 59
 * 1분 단위
 */
const MINUTE_OPTIONS =
    Array.from(
        {
            length: 60,
        },
        (
            _,
            index
        ) =>
            index
    );


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
 * 날짜
 * =====================================================
 */

function createDateWithOffset(
    dayOffset: number
) {
    const date =
        new Date();

    date.setDate(
        date.getDate() +
        dayOffset
    );

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}


function createDateOptions():
    DateOption[] {
    return [
        {
            label: "오늘",

            value:
                createDateWithOffset(
                    0
                ),
        },

        {
            label: "내일",

            value:
                createDateWithOffset(
                    1
                ),
        },

        {
            label: "모레",

            value:
                createDateWithOffset(
                    2
                ),
        },
    ];
}


function formatDate(
    date: Date
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() +
            1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}. ${month}. ${day}`;
}


/*
 * =====================================================
 * 시간
 * =====================================================
 */

function formatTime(
    hour: number,
    minute: number
) {
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
 * 오전 / 오후 + 12시간제를
 * 24시간제로 변환합니다.
 */
function convertTo24Hour(
    period: Period,
    hour: number
) {
    if (
        period === "오전"
    ) {
        return hour === 12
            ? 0
            : hour;
    }

    return hour === 12
        ? 12
        : hour + 12;
}


/*
 * =====================================================
 * 최소 30분 이후 검증
 * =====================================================
 */

/*
 * 일정은 현재 시각 기준
 * 최소 30분 이후부터 등록할 수 있습니다.
 */
function isLessThan30MinutesLater(
    date: Date,
    hour: number,
    minute: number
) {
    const selectedDateTime =
        new Date(date);

    selectedDateTime.setHours(
        hour,
        minute,
        0,
        0
    );


    const minimumDateTime =
        Date.now() +
        30 *
        60 *
        1000;


    return (
        selectedDateTime.getTime() <
        minimumDateTime
    );
}


/*
 * =====================================================
 * 일정 ID
 * =====================================================
 */

function createLocalScheduleId() {
    return `schedule-${Date.now()}-${Math.random()
        .toString(36)
        .slice(
            2,
            9
        )}`;
}


/*
 * =====================================================
 * 반복 일정 Series ID
 * =====================================================
 */

function createLocalSeriesId() {
    return `series-${Date.now()}-${Math.random()
        .toString(36)
        .slice(
            2,
            9
        )}`;
}


/*
 * =====================================================
 * 반복 일정 생성 범위
 * =====================================================
 *
 * MVP에서는 반복 일정을 무한히 생성하지 않고
 * 시작일을 포함하여 향후 90일 범위의 회차를
 * 미리 생성합니다.
 *
 * none
 * → 선택한 일정 1건만 생성
 *
 * daily
 * → 매일 생성
 *
 * weekday
 * → 월 ~ 금만 생성
 *
 * weekly
 * → 시작일과 동일한 요일로 매주 생성
 *
 * 추후 서버 동기화 / 백그라운드 생성 구조로 전환하면
 * 이 정책은 변경할 수 있습니다.
 * =====================================================
 */

const REPEAT_GENERATION_DAYS =
    90;


/*
 * 시작 일정의 날짜 / 시간을 기준으로
 * 실제 저장할 반복 회차 Date 배열을 생성합니다.
 */
function createRepeatDates(
    startDate: Date,
    repeatType: RepeatType
) {
    if (
        repeatType ===
        "none"
    ) {
        return [
            new Date(
                startDate
            ),
        ];
    }


    const dates:
        Date[] =
        [];


    const endDate =
        new Date(
            startDate
        );


    endDate.setDate(
        endDate.getDate() +
        REPEAT_GENERATION_DAYS
    );


    /*
     * 매일 / 평일 반복은
     * 하루씩 이동하면서 조건에 맞는 날짜를 추가합니다.
     */
    if (
        repeatType ===
        "daily" ||
        repeatType ===
        "weekday"
    ) {
        const currentDate =
            new Date(
                startDate
            );


        while (
            currentDate.getTime() <=
            endDate.getTime()
            ) {
            const day =
                currentDate.getDay();


            const shouldAdd =
                repeatType ===
                "daily"
                    ? true
                    : day !== 0 &&
                    day !== 6;


            if (
                shouldAdd
            ) {
                dates.push(
                    new Date(
                        currentDate
                    )
                );
            }


            currentDate.setDate(
                currentDate.getDate() +
                1
            );
        }


        return dates;
    }


    /*
     * 매주 반복은 시작일과 동일한 요일이므로
     * 7일씩 이동하면서 생성합니다.
     */
    const currentDate =
        new Date(
            startDate
        );


    while (
        currentDate.getTime() <=
        endDate.getTime()
        ) {
        dates.push(
            new Date(
                currentDate
            )
        );


        currentDate.setDate(
            currentDate.getDate() +
            7
        );
    }


    return dates;
}


/*
 * =====================================================
 * Local Notification
 * =====================================================
 */

async function ensureNotificationPermission() {
    const currentPermission =
        await getPermissionsAsync();


    if (
        currentPermission.granted
    ) {
        return true;
    }


    const requestedPermission =
        await requestPermissionsAsync();


    return (
        requestedPermission.granted
    );
}


/*
 * 일정 Local Notification을
 * 회차별로 딱 1회 예약합니다.
 *
 * 반복 일정은 각 회차마다
 * 서로 다른 scheduleId와
 * localNotificationId를 사용합니다.
 */
async function scheduleLocalNotification(
    scheduleId: string,
    title: string,
    scheduledDate: Date,
    reminderMinutes: number | null
) {
    if (
        reminderMinutes === null
    ) {
        return null;
    }


    const permissionGranted =
        await ensureNotificationPermission();


    if (
        !permissionGranted
    ) {
        throw new Error(
            "Notification permission denied."
        );
    }


    const notificationDate =
        new Date(
            scheduledDate.getTime() -
            reminderMinutes *
            60 *
            1000
        );


    if (
        notificationDate.getTime() <=
        Date.now()
    ) {
        throw new Error(
            "Notification time is already past."
        );
    }


    /*
     * =====================================================
     * Expo Go 테스트용
     *
     * Android Notification Channel을
     * 직접 생성하지 않습니다.
     *
     * Development Build에서는
     * Notification Channel 설정을 다시 추가합니다.
     * =====================================================
     */


    const notificationId =
        await scheduleNotificationAsync(
            {
                content: {
                    title:
                        "일정이 곧 시작돼요",

                    body:
                    title,

                    sound:
                        "default",

                    data: {
                        scheduleId,
                    },
                },

                trigger: {
                    type:
                    SchedulableTriggerInputTypes.DATE,

                    date:
                    notificationDate,
                },
            }
        );


    console.log(
        "로컬 알림 예약 완료:",
        {
            notificationId,

            scheduleId,

            notificationDate:
                notificationDate.toISOString(),
        }
    );


    return notificationId;
}


/*
 * =====================================================
 * Screen
 * =====================================================
 */

export default function CreateManualScreen() {
    const {
        session,
    } =
        useAuth();


    const [
        title,
        setTitle,
    ] =
        useState("");


    const [
        memo,
        setMemo,
    ] =
        useState("");


    const [
        selectedDate,
        setSelectedDate,
    ] =
        useState<Date>(
            createDateWithOffset(
                0
            )
        );


    /*
     * 반복 기본값
     *
     * 신규 일정은 기본적으로
     * 반복 없음입니다.
     */
    const [
        repeatType,
        setRepeatType,
    ] =
        useState<RepeatType>(
            "none"
        );


    /*
     * 기본 시간
     *
     * 현재 시각 + 30분 이후의
     * 가장 가까운 1분 단위 시간을 사용합니다.
     */
    const initialTime =
        useMemo(
            () => {
                const minimumTime =
                    new Date(
                        Date.now() +
                        30 *
                        60 *
                        1000
                    );


                if (
                    minimumTime.getSeconds() >
                    0 ||
                    minimumTime.getMilliseconds() >
                    0
                ) {
                    minimumTime.setMinutes(
                        minimumTime.getMinutes() +
                        1
                    );
                }


                minimumTime.setSeconds(
                    0,
                    0
                );


                return {
                    hour:
                        minimumTime.getHours(),

                    minute:
                        minimumTime.getMinutes(),
                };
            },
            []
        );


    const [
        selectedHour,
        setSelectedHour,
    ] =
        useState(
            initialTime.hour
        );


    const [
        selectedMinute,
        setSelectedMinute,
    ] =
        useState(
            initialTime.minute
        );


    const [
        reminderMinutes,
        setReminderMinutes,
    ] =
        useState<
            number | null
        >(
            null
        );


    const [
        selectionModal,
        setSelectionModal,
    ] =
        useState<SelectionModalType>(
            null
        );


    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );


    const dateOptions =
        useMemo(
            () =>
                createDateOptions(),
            []
        );


    const selectedTimeText =
        formatTime(
            selectedHour,
            selectedMinute
        );


    const selectedReminderText =
        REMINDER_OPTIONS.find(
            (
                option
            ) =>
                option.value ===
                reminderMinutes
        )?.label ??
        "알림 없음";


    const selectedRepeatText =
        REPEAT_OPTIONS.find(
            (
                option
            ) =>
                option.value ===
                repeatType
        )?.label ??
        "반복 없음";


    const canContinue =
        title.trim().length >
        0 &&
        !saving;


    /*
     * =====================================================
     * 일정 저장
     * =====================================================
     */

    const handleConfirm =
        async () => {
            if (
                !title.trim() ||
                saving
            ) {
                return;
            }


            if (
                isLessThan30MinutesLater(
                    selectedDate,
                    selectedHour,
                    selectedMinute
                )
            ) {
                Alert.alert(
                    "시간을 다시 선택해 주세요",
                    "최소 30분 후의 시간을 선택해 주세요."
                );

                return;
            }


            setSaving(
                true
            );


            try {
                const scheduledDate =
                    new Date(
                        selectedDate
                    );


                scheduledDate.setHours(
                    selectedHour,
                    selectedMinute,
                    0,
                    0
                );


                const storageKey =
                    getScheduleStorageKey(
                        session?.user.id
                    );


                const storedSchedules =
                    await AsyncStorage.getItem(
                        storageKey
                    );


                let schedules:
                    LocalSchedule[] =
                    [];


                if (
                    storedSchedules
                ) {
                    const parsed =
                        JSON.parse(
                            storedSchedules
                        );


                    if (
                        Array.isArray(
                            parsed
                        )
                    ) {
                        /*
                         * 기존에 저장된 일정에는
                         * repeatType / seriesId가 없을 수 있습니다.
                         *
                         * 기존 데이터는 삭제하지 않고
                         * 누락된 값을 보정합니다.
                         */
                        schedules =
                            parsed.map(
                                (
                                    schedule
                                ) => ({
                                    ...schedule,

                                    seriesId:
                                        schedule.seriesId ??
                                        null,

                                    repeatType:
                                        schedule.repeatType ??
                                        "none",
                                })
                            );
                    }
                }


                /*
                 * =================================================
                 * 반복 일정 Series ID
                 *
                 * 반복 없음
                 * → seriesId = null
                 *
                 * 반복 일정
                 * → 생성되는 모든 회차가 같은 seriesId 사용
                 * =================================================
                 */
                const seriesId =
                    repeatType ===
                    "none"
                        ? null
                        : createLocalSeriesId();


                /*
                 * =================================================
                 * 실제 생성할 회차 날짜 계산
                 *
                 * none
                 * → 1건
                 *
                 * daily / weekday / weekly
                 * → 시작일 포함 향후 90일 범위
                 * =================================================
                 */
                const repeatDates =
                    createRepeatDates(
                        scheduledDate,
                        repeatType
                    );


                const newSchedules:
                    LocalSchedule[] =
                    [];


                let notificationFailureCount =
                    0;


                /*
                 * =================================================
                 * 반복 일정 회차별 생성
                 *
                 * 각 회차는:
                 *
                 * → 서로 다른 scheduleId
                 * → 동일한 seriesId
                 * → 서로 다른 localNotificationId
                 *
                 * 를 사용합니다.
                 * =================================================
                 */
                for (
                    const repeatDate
                    of repeatDates
                    ) {
                    const scheduleId =
                        createLocalScheduleId();


                    let localNotificationId:
                        string | null =
                        null;


                    if (
                        reminderMinutes !==
                        null
                    ) {
                        try {
                            localNotificationId =
                                await scheduleLocalNotification(
                                    scheduleId,

                                    title.trim(),

                                    repeatDate,

                                    reminderMinutes
                                );
                        } catch (
                            notificationError
                            ) {
                            /*
                             * 특정 회차의 알림 예약에 실패해도
                             * 전체 일정 저장은 계속 진행합니다.
                             *
                             * 예:
                             * 첫 회차의 알림 시간이 이미 지난 경우
                             * 이후 회차 알림은 정상 예약할 수 있습니다.
                             */
                            notificationFailureCount +=
                                1;


                            console.error(
                                "반복 일정 회차 알림 예약 오류:",
                                {
                                    scheduleId,

                                    scheduledAt:
                                        repeatDate.toISOString(),

                                    notificationError,
                                }
                            );
                        }
                    }


                    const newSchedule:
                        LocalSchedule = {
                        id:
                        scheduleId,

                        /*
                         * 반복 없음은 null,
                         * 반복 일정은 모든 회차가 같은 seriesId를 사용합니다.
                         */
                        seriesId,

                        title:
                            title.trim(),

                        memo:
                            memo.trim() ||
                            null,

                        scheduledAt:
                            repeatDate.toISOString(),

                        /*
                         * 반복 설정 저장
                         */
                        repeatType,

                        status:
                            "pending",

                        completed:
                            false,

                        reminderMinutes,

                        localNotificationId,
                    };


                    newSchedules.push(
                        newSchedule
                    );
                }


                /*
                 * =================================================
                 * Storage 저장
                 *
                 * 기존 일정 뒤에
                 * 이번에 생성한 모든 반복 회차를 추가합니다.
                 * =================================================
                 */
                await AsyncStorage.setItem(
                    storageKey,

                    JSON.stringify(
                        [
                            ...schedules,
                            ...newSchedules,
                        ]
                    )
                );


                console.log(
                    "로컬 일정 저장 완료:",
                    {
                        repeatType,

                        seriesId,

                        createdCount:
                        newSchedules.length,

                        notificationFailureCount,

                        schedules:
                        newSchedules,
                    }
                );


                /*
                 * 일부 알림 예약이 실패해도
                 * 일정 자체는 정상 저장합니다.
                 */
                if (
                    notificationFailureCount >
                    0
                ) {
                    Alert.alert(
                        "일정은 저장했어요",
                        `${notificationFailureCount}개 회차의 알림은 예약하지 못했어요.`
                    );
                }


                router.replace(
                    "/"
                );
            } catch (
                error
                ) {
                console.error(
                    "로컬 일정 저장 오류:",
                    error
                );


                Alert.alert(
                    "일정을 저장하지 못했어요",
                    "잠시 후 다시 시도해 주세요."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };


    /*
     * =====================================================
     * 날짜 선택
     * =====================================================
     */

    const handleSelectDate =
        (
            date: Date
        ) => {
            setSelectedDate(
                new Date(
                    date
                )
            );


            setSelectionModal(
                null
            );
        };


    /*
     * =====================================================
     * 시간 선택
     * =====================================================
     */

    const handleSelectTime =
        (
            hour: number,
            minute: number
        ) => {
            if (
                isLessThan30MinutesLater(
                    selectedDate,
                    hour,
                    minute
                )
            ) {
                Alert.alert(
                    "시간을 다시 선택해 주세요",
                    "최소 30분 후의 시간을 선택해 주세요."
                );

                return;
            }


            setSelectedHour(
                hour
            );


            setSelectedMinute(
                minute
            );


            setSelectionModal(
                null
            );
        };


    /*
     * =====================================================
     * 알림 선택
     * =====================================================
     */

    const handleSelectReminder =
        (
            value:
                number | null
        ) => {
            setReminderMinutes(
                value
            );


            setSelectionModal(
                null
            );
        };


    /*
     * =====================================================
     * 반복 선택
     * =====================================================
     */

    const handleSelectRepeat =
        (
            value: RepeatType
        ) => {
            setRepeatType(
                value
            );


            setSelectionModal(
                null
            );
        };


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
                    {/* 상단 */}
                    <View
                        style={
                            styles.header
                        }
                    >
                        <Pressable
                            onPress={() =>
                                router.back()
                            }
                            hitSlop={
                                12
                            }
                        >
                            <Ionicons
                                name="chevron-back"
                                size={
                                    28
                                }
                                color="#111111"
                            />
                        </Pressable>


                        <Text
                            style={
                                styles.headerTitle
                            }
                        >
                            직접 입력
                        </Text>


                        <View
                            style={
                                styles.headerSpacer
                            }
                        />
                    </View>


                    {/* 안내 */}
                    <View
                        style={
                            styles.titleArea
                        }
                    >
                        <Text
                            style={
                                styles.title
                            }
                        >
                            일정을 입력해 주세요
                        </Text>


                        <Text
                            style={
                                styles.subtitle
                            }
                        >
                            필요한 일정 정보를 직접 입력할 수 있어요.
                        </Text>
                    </View>


                    {/*
                     * 입력 항목이 늘어나도
                     * 작은 화면에서 하단이 잘리지 않도록
                     * Form 영역을 ScrollView로 처리합니다.
                     */}
                    <ScrollView
                        style={
                            styles.formScroll
                        }
                        contentContainerStyle={
                            styles.formScrollContent
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                        keyboardShouldPersistTaps="handled"
                    >
                        <View
                            style={
                                styles.form
                            }
                        >
                            {/* 제목 */}
                            <View
                                style={
                                    styles.inputRow
                                }
                            >
                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    제목
                                </Text>


                                <TextInput
                                    style={
                                        styles.titleInput
                                    }
                                    value={
                                        title
                                    }
                                    onChangeText={
                                        setTitle
                                    }
                                    placeholder="일정 제목을 입력해 주세요"
                                    placeholderTextColor="#A1A4AA"
                                    maxLength={
                                        50
                                    }
                                />
                            </View>


                            {/* 날짜 */}
                            <Pressable
                                style={
                                    styles.optionRow
                                }
                                onPress={() =>
                                    setSelectionModal(
                                        "date"
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    날짜
                                </Text>


                                <View
                                    style={
                                        styles.optionValueArea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.optionValue
                                        }
                                    >
                                        {formatDate(
                                            selectedDate
                                        )}
                                    </Text>


                                    <Ionicons
                                        name="chevron-forward"
                                        size={
                                            20
                                        }
                                        color="#8A8E96"
                                    />
                                </View>
                            </Pressable>


                            {/* 시간 */}
                            <Pressable
                                style={
                                    styles.optionRow
                                }
                                onPress={() =>
                                    setSelectionModal(
                                        "time"
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    시간
                                </Text>


                                <View
                                    style={
                                        styles.optionValueArea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.optionValue
                                        }
                                    >
                                        {
                                            selectedTimeText
                                        }
                                    </Text>


                                    <Ionicons
                                        name="chevron-forward"
                                        size={
                                            20
                                        }
                                        color="#8A8E96"
                                    />
                                </View>
                            </Pressable>


                            {/* 알림 */}
                            <Pressable
                                style={
                                    styles.optionRow
                                }
                                onPress={() =>
                                    setSelectionModal(
                                        "reminder"
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    알림
                                </Text>


                                <View
                                    style={
                                        styles.optionValueArea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.optionValue
                                        }
                                    >
                                        {
                                            selectedReminderText
                                        }
                                    </Text>


                                    <Ionicons
                                        name="chevron-forward"
                                        size={
                                            20
                                        }
                                        color="#8A8E96"
                                    />
                                </View>
                            </Pressable>


                            {/* 반복 */}
                            <Pressable
                                style={
                                    styles.optionRow
                                }
                                onPress={() =>
                                    setSelectionModal(
                                        "repeat"
                                    )
                                }
                            >
                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    반복
                                </Text>


                                <View
                                    style={
                                        styles.optionValueArea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.optionValue
                                        }
                                    >
                                        {
                                            selectedRepeatText
                                        }
                                    </Text>


                                    <Ionicons
                                        name="chevron-forward"
                                        size={
                                            20
                                        }
                                        color="#8A8E96"
                                    />
                                </View>
                            </Pressable>


                            {/* 메모 */}
                            <View
                                style={[
                                    styles.memoRow,
                                    styles.lastOptionRow,
                                ]}
                            >
                                <Text
                                    style={
                                        styles.memoLabel
                                    }
                                >
                                    메모
                                </Text>


                                <TextInput
                                    style={
                                        styles.memoInput
                                    }
                                    value={
                                        memo
                                    }
                                    onChangeText={
                                        setMemo
                                    }
                                    placeholder="메모를 입력해 주세요"
                                    placeholderTextColor="#A1A4AA"
                                    multiline
                                    textAlignVertical="top"
                                    maxLength={
                                        500
                                    }
                                />


                                <Text
                                    style={
                                        styles.memoCount
                                    }
                                >
                                    {memo.length}/500
                                </Text>
                            </View>
                        </View>


                        <View
                            style={
                                styles.guide
                            }
                        >
                            <Ionicons
                                name="information-circle-outline"
                                size={
                                    16
                                }
                                color="#92959C"
                            />


                            <Text
                                style={
                                    styles.guideText
                                }
                            >
                                일정은 현재 이 기기에 저장됩니다.
                            </Text>
                        </View>
                    </ScrollView>


                    {/* 하단 */}
                    <View
                        style={
                            styles.bottomArea
                        }
                    >
                        <Pressable
                            style={[
                                styles.confirmButton,

                                !canContinue &&
                                styles.confirmButtonDisabled,
                            ]}
                            onPress={
                                handleConfirm
                            }
                            disabled={
                                !canContinue
                            }
                        >
                            <Text
                                style={[
                                    styles.confirmButtonText,

                                    !canContinue &&
                                    styles.confirmButtonTextDisabled,
                                ]}
                            >
                                {saving
                                    ? "저장 중..."
                                    : "일정 확인"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>


            {/* 날짜 선택 */}
            <SimpleSelectionModal
                visible={
                    selectionModal ===
                    "date"
                }
                title="날짜 선택"
                onClose={() =>
                    setSelectionModal(
                        null
                    )
                }
            >
                {dateOptions.map(
                    (
                        option
                    ) => (
                        <SelectionButton
                            key={
                                option.label
                            }
                            label={`${option.label} · ${formatDate(
                                option.value
                            )}`}
                            selected={
                                formatDate(
                                    selectedDate
                                ) ===
                                formatDate(
                                    option.value
                                )
                            }
                            onPress={() =>
                                handleSelectDate(
                                    option.value
                                )
                            }
                        />
                    )
                )}
            </SimpleSelectionModal>


            {/* 시간 선택 */}
            <TimeWheelModal
                visible={
                    selectionModal ===
                    "time"
                }
                selectedHour={
                    selectedHour
                }
                selectedMinute={
                    selectedMinute
                }
                onClose={() =>
                    setSelectionModal(
                        null
                    )
                }
                onConfirm={
                    handleSelectTime
                }
            />


            {/* 알림 선택 */}
            <SimpleSelectionModal
                visible={
                    selectionModal ===
                    "reminder"
                }
                title="알림 선택"
                onClose={() =>
                    setSelectionModal(
                        null
                    )
                }
            >
                {REMINDER_OPTIONS.map(
                    (
                        option
                    ) => (
                        <SelectionButton
                            key={
                                option.label
                            }
                            label={
                                option.label
                            }
                            selected={
                                reminderMinutes ===
                                option.value
                            }
                            onPress={() =>
                                handleSelectReminder(
                                    option.value
                                )
                            }
                        />
                    )
                )}
            </SimpleSelectionModal>


            {/* 반복 설정 */}
            <SimpleSelectionModal
                visible={
                    selectionModal ===
                    "repeat"
                }
                title="반복 설정"
                onClose={() =>
                    setSelectionModal(
                        null
                    )
                }
            >
                {REPEAT_OPTIONS.map(
                    (
                        option
                    ) => (
                        <SelectionButton
                            key={
                                option.value
                            }
                            label={
                                option.label
                            }
                            selected={
                                repeatType ===
                                option.value
                            }
                            onPress={() =>
                                handleSelectRepeat(
                                    option.value
                                )
                            }
                            selectionType="radio"
                        />
                    )
                )}


                {repeatType ===
                    "weekday" && (
                        <View
                            style={
                                styles.repeatNotice
                            }
                        >
                            <Text
                                style={
                                    styles.repeatNoticeText
                                }
                            >
                                공휴일 포함 월~금 반복해요.
                            </Text>
                        </View>
                    )}
            </SimpleSelectionModal>
        </>
    );
}


/*
 * =====================================================
 * 시간 Wheel Picker
 * =====================================================
 */

function TimeWheelModal({
                            visible,
                            selectedHour,
                            selectedMinute,
                            onClose,
                            onConfirm,
                        }: {
    visible: boolean;

    selectedHour: number;

    selectedMinute: number;

    onClose:
        () => void;

    onConfirm:
        (
            hour: number,
            minute: number
        ) => void;
}) {
    const initialPeriod:
        Period =
        selectedHour <
        12
            ? "오전"
            : "오후";


    const initialDisplayHour =
        selectedHour %
        12 ===
        0
            ? 12
            : selectedHour %
            12;


    const [
        period,
        setPeriod,
    ] =
        useState<Period>(
            initialPeriod
        );


    const [
        hour,
        setHour,
    ] =
        useState(
            initialDisplayHour
        );


    const [
        minute,
        setMinute,
    ] =
        useState(
            selectedMinute
        );


    const handleConfirm =
        () => {
            const hour24 =
                convertTo24Hour(
                    period,
                    hour
                );


            onConfirm(
                hour24,
                minute
            );
        };


    return (
        <Modal
            visible={
                visible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
                onClose
            }
        >
            <View
                style={
                    styles.modalOverlay
                }
            >
                <Pressable
                    style={
                        StyleSheet.absoluteFill
                    }
                    onPress={
                        onClose
                    }
                />


                <View
                    style={
                        styles.timeModal
                    }
                >
                    <View
                        style={
                            styles.selectionHeader
                        }
                    >
                        <Text
                            style={
                                styles.selectionTitle
                            }
                        >
                            시간 선택
                        </Text>


                        <Pressable
                            onPress={
                                onClose
                            }
                            hitSlop={
                                10
                            }
                        >
                            <Ionicons
                                name="close"
                                size={
                                    24
                                }
                                color="#111111"
                            />
                        </Pressable>
                    </View>


                    <View
                        style={
                            styles.wheelContainer
                        }
                    >
                        <View
                            style={
                                styles.wheelSelectionBackground
                            }
                            pointerEvents="none"
                        />


                        <WheelColumn
                            items={
                                PERIOD_OPTIONS
                            }
                            selectedValue={
                                period
                            }
                            onChange={(
                                value
                            ) =>
                                setPeriod(
                                    value as Period
                                )
                            }
                        />


                        <WheelColumn
                            items={
                                HOUR_OPTIONS
                            }
                            selectedValue={
                                hour
                            }
                            onChange={(
                                value
                            ) =>
                                setHour(
                                    Number(
                                        value
                                    )
                                )
                            }
                        />


                        <Text
                            style={
                                styles.timeColon
                            }
                        >
                            :
                        </Text>


                        <WheelColumn
                            items={
                                MINUTE_OPTIONS
                            }
                            selectedValue={
                                minute
                            }
                            formatItem={(
                                value
                            ) =>
                                String(
                                    value
                                ).padStart(
                                    2,
                                    "0"
                                )
                            }
                            onChange={(
                                value
                            ) =>
                                setMinute(
                                    Number(
                                        value
                                    )
                                )
                            }
                        />
                    </View>


                    <Pressable
                        style={
                            styles.timeConfirmButton
                        }
                        onPress={
                            handleConfirm
                        }
                    >
                        <Text
                            style={
                                styles.timeConfirmButtonText
                            }
                        >
                            확인
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}


/*
 * =====================================================
 * Wheel Column
 * =====================================================
 */

function WheelColumn({
                         items,
                         selectedValue,
                         onChange,
                         formatItem,
                     }: {
    items:
        readonly (
            | string
            | number
            )[];

    selectedValue:
        string | number;

    onChange:
        (
            value:
                string | number
        ) => void;

    formatItem?:
        (
            value:
                string | number
        ) => string;
}) {
    const selectedIndex =
        Math.max(
            items.findIndex(
                (
                    item
                ) =>
                    item ===
                    selectedValue
            ),
            0
        );


    const handleScrollEnd =
        (
            offsetY: number
        ) => {
            const rawIndex =
                Math.round(
                    offsetY /
                    WHEEL_ITEM_HEIGHT
                );


            const index =
                Math.max(
                    0,
                    Math.min(
                        rawIndex,
                        items.length -
                        1
                    )
                );


            onChange(
                items[
                    index
                    ]
            );
        };


    return (
        <ScrollView
            style={
                styles.wheelColumn
            }
            contentContainerStyle={
                styles.wheelContent
            }
            showsVerticalScrollIndicator={
                false
            }
            snapToInterval={
                WHEEL_ITEM_HEIGHT
            }
            decelerationRate="fast"
            nestedScrollEnabled
            contentOffset={{
                x:
                    0,

                y:
                    selectedIndex *
                    WHEEL_ITEM_HEIGHT,
            }}
            onMomentumScrollEnd={(
                event
            ) => {
                handleScrollEnd(
                    event
                        .nativeEvent
                        .contentOffset
                        .y
                );
            }}
            onScrollEndDrag={(
                event
            ) => {
                handleScrollEnd(
                    event
                        .nativeEvent
                        .contentOffset
                        .y
                );
            }}
        >
            {items.map(
                (
                    item,
                    index
                ) => {
                    const selected =
                        item ===
                        selectedValue;


                    return (
                        <View
                            key={`${item}-${index}`}
                            style={
                                styles.wheelItem
                            }
                        >
                            <Text
                                style={[
                                    styles.wheelItemText,

                                    selected &&
                                    styles.wheelItemTextSelected,
                                ]}
                            >
                                {formatItem
                                    ? formatItem(
                                        item
                                    )
                                    : String(
                                        item
                                    )}
                            </Text>
                        </View>
                    );
                }
            )}
        </ScrollView>
    );
}


/*
 * =====================================================
 * 일반 선택 Modal
 * =====================================================
 */

function SimpleSelectionModal({
                                  visible,
                                  title,
                                  onClose,
                                  children,
                              }: {
    visible: boolean;

    title: string;

    onClose:
        () => void;

    children:
        ReactNode;
}) {
    return (
        <Modal
            visible={
                visible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
                onClose
            }
        >
            <View
                style={
                    styles.modalOverlay
                }
            >
                <Pressable
                    style={
                        StyleSheet.absoluteFill
                    }
                    onPress={
                        onClose
                    }
                />


                <View
                    style={
                        styles.selectionModal
                    }
                >
                    <View
                        style={
                            styles.modalHandle
                        }
                    />


                    <View
                        style={
                            styles.selectionHeader
                        }
                    >
                        <Text
                            style={
                                styles.selectionTitle
                            }
                        >
                            {
                                title
                            }
                        </Text>


                        <Pressable
                            onPress={
                                onClose
                            }
                            hitSlop={
                                10
                            }
                        >
                            <Ionicons
                                name="close"
                                size={
                                    24
                                }
                                color="#111111"
                            />
                        </Pressable>
                    </View>


                    <View
                        style={
                            styles.selectionList
                        }
                    >
                        {
                            children
                        }
                    </View>
                </View>
            </View>
        </Modal>
    );
}


/*
 * =====================================================
 * Selection Button
 * =====================================================
 */

function SelectionButton({
                             label,
                             selected,
                             onPress,
                             selectionType = "check",
                         }: {
    label: string;

    selected: boolean;

    onPress:
        () => void;

    selectionType?:
        | "check"
        | "radio";
}) {
    return (
        <Pressable
            style={
                styles.selectionButton
            }
            onPress={
                onPress
            }
        >
            <View
                style={
                    styles.selectionButtonLeft
                }
            >
                {selectionType ===
                    "radio" && (
                        <View
                            style={[
                                styles.radioOuter,

                                selected &&
                                styles.radioOuterSelected,
                            ]}
                        >
                            {selected && (
                                <View
                                    style={
                                        styles.radioInner
                                    }
                                />
                            )}
                        </View>
                    )}


                <Text
                    style={[
                        styles.selectionButtonText,

                        selected &&
                        styles.selectionButtonTextSelected,
                    ]}
                >
                    {
                        label
                    }
                </Text>
            </View>


            {selectionType ===
                "check" &&
                selected && (
                    <Ionicons
                        name="checkmark"
                        size={
                            21
                        }
                        color="#111111"
                    />
                )}
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
                "#FFFFFF",
        },


        container: {
            flex:
                1,

            paddingHorizontal:
                24,

            backgroundColor:
                "#FFFFFF",
        },


        header: {
            height:
                64,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },


        headerTitle: {
            fontSize:
                17,

            fontWeight:
                "600",

            color:
                "#111111",
        },


        headerSpacer: {
            width:
                28,
        },


        titleArea: {
            marginTop:
                20,
        },


        title: {
            fontSize:
                26,

            lineHeight:
                36,

            fontWeight:
                "700",

            color:
                "#111111",
        },


        subtitle: {
            marginTop:
                8,

            fontSize:
                15,

            lineHeight:
                22,

            color:
                "#8A8E96",
        },


        formScroll: {
            flex:
                1,

            marginTop:
                20,
        },


        formScrollContent: {
            paddingBottom:
                24,
        },


        form: {
            borderWidth:
                1,

            borderColor:
                "#E5E6E9",

            borderRadius:
                12,

            overflow:
                "hidden",

            backgroundColor:
                "#FFFFFF",
        },


        inputRow: {
            minHeight:
                64,

            paddingHorizontal:
                16,

            flexDirection:
                "row",

            alignItems:
                "center",

            borderBottomWidth:
                1,

            borderBottomColor:
                "#ECEDEF",
        },


        optionRow: {
            minHeight:
                64,

            paddingHorizontal:
                16,

            flexDirection:
                "row",

            alignItems:
                "center",

            borderBottomWidth:
                1,

            borderBottomColor:
                "#ECEDEF",
        },


        lastOptionRow: {
            borderBottomWidth:
                0,
        },


        label: {
            width:
                72,

            fontSize:
                15,

            fontWeight:
                "500",

            color:
                "#55585F",
        },


        titleInput: {
            flex:
                1,

            height:
                56,

            fontSize:
                15,

            color:
                "#111111",
        },


        optionValueArea: {
            flex:
                1,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },


        optionValue: {
            fontSize:
                15,

            color:
                "#111111",
        },


        /*
         * 메모 입력 영역
         */
        memoRow: {
            minHeight:
                120,

            paddingHorizontal:
                16,

            paddingTop:
                16,

            paddingBottom:
                12,

            flexDirection:
                "row",

            alignItems:
                "flex-start",

            position:
                "relative",
        },


        memoLabel: {
            width:
                72,

            paddingTop:
                2,

            fontSize:
                15,

            fontWeight:
                "500",

            color:
                "#55585F",
        },


        memoInput: {
            flex:
                1,

            minHeight:
                82,

            paddingTop:
                0,

            paddingBottom:
                20,

            paddingHorizontal:
                0,

            fontSize:
                15,

            lineHeight:
                22,

            color:
                "#111111",
        },


        memoCount: {
            position:
                "absolute",

            right:
                14,

            bottom:
                10,

            fontSize:
                11,

            color:
                "#A1A4AA",
        },


        guide: {
            marginTop:
                16,

            minHeight:
                44,

            paddingHorizontal:
                12,

            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                6,

            borderRadius:
                4,

            backgroundColor:
                "#F7F7F8",
        },


        guideText: {
            flex:
                1,

            fontSize:
                13,

            lineHeight:
                19,

            color:
                "#8A8E96",
        },


        bottomArea: {
            paddingTop:
                12,

            paddingBottom:
                16,

            backgroundColor:
                "#FFFFFF",
        },


        confirmButton: {
            height:
                56,

            borderRadius:
                4,

            alignItems:
                "center",

            justifyContent:
                "center",

            backgroundColor:
                "#111111",
        },


        confirmButtonDisabled: {
            backgroundColor:
                "#D5D6D9",
        },


        confirmButtonText: {
            fontSize:
                17,

            fontWeight:
                "600",

            color:
                "#FFFFFF",
        },


        confirmButtonTextDisabled: {
            color:
                "#F7F7F7",
        },


        modalOverlay: {
            flex:
                1,

            paddingHorizontal:
                24,

            backgroundColor:
                "rgba(0, 0, 0, 0.32)",

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        selectionModal: {
            width:
                "100%",

            maxWidth:
                342,

            paddingHorizontal:
                20,

            paddingTop:
                10,

            paddingBottom:
                18,

            borderRadius:
                12,

            backgroundColor:
                "#FFFFFF",
        },


        modalHandle: {
            width:
                32,

            height:
                4,

            marginBottom:
                14,

            alignSelf:
                "center",

            borderRadius:
                2,

            backgroundColor:
                "#D5D6D9",
        },


        selectionHeader: {
            minHeight:
                42,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",
        },


        selectionTitle: {
            fontSize:
                19,

            fontWeight:
                "700",

            color:
                "#111111",
        },


        selectionList: {
            marginTop:
                10,
        },


        selectionButton: {
            minHeight:
                54,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "space-between",

            borderBottomWidth:
                1,

            borderBottomColor:
                "#F0F0F1",
        },


        selectionButtonLeft: {
            flexDirection:
                "row",

            alignItems:
                "center",

            gap:
                10,
        },


        selectionButtonText: {
            fontSize:
                15,

            color:
                "#55585F",
        },


        selectionButtonTextSelected: {
            color:
                "#111111",

            fontWeight:
                "600",
        },


        /*
         * 반복 설정 Radio
         */

        radioOuter: {
            width:
                20,

            height:
                20,

            borderWidth:
                1.5,

            borderColor:
                "#A1A4AA",

            borderRadius:
                10,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        radioOuterSelected: {
            borderColor:
                "#111111",
        },


        radioInner: {
            width:
                10,

            height:
                10,

            borderRadius:
                5,

            backgroundColor:
                "#111111",
        },


        repeatNotice: {
            marginTop:
                16,

            minHeight:
                72,

            paddingHorizontal:
                16,

            paddingVertical:
                16,

            borderRadius:
                10,

            alignItems:
                "center",

            justifyContent:
                "center",

            backgroundColor:
                "#FFF3F3",
        },


        repeatNoticeText: {
            fontSize:
                13,

            lineHeight:
                20,

            color:
                "#666666",
        },


        /*
         * =====================================================
         * 시간 Wheel Picker
         * =====================================================
         */

        timeModal: {
            width:
                "100%",

            maxWidth:
                342,

            paddingHorizontal:
                20,

            paddingTop:
                20,

            paddingBottom:
                20,

            borderRadius:
                16,

            backgroundColor:
                "#FFFFFF",
        },


        wheelContainer: {
            height:
                WHEEL_ITEM_HEIGHT *
                5,

            marginTop:
                20,

            flexDirection:
                "row",

            alignItems:
                "center",

            justifyContent:
                "center",

            overflow:
                "hidden",
        },


        wheelColumn: {
            flex:
                1,

            height:
                WHEEL_ITEM_HEIGHT *
                5,

            zIndex:
                2,
        },


        wheelContent: {
            paddingVertical:
                WHEEL_ITEM_HEIGHT *
                2,
        },


        wheelItem: {
            height:
            WHEEL_ITEM_HEIGHT,

            alignItems:
                "center",

            justifyContent:
                "center",
        },


        wheelItemText: {
            fontSize:
                18,

            color:
                "#B2B4B9",
        },


        wheelItemTextSelected: {
            fontSize:
                21,

            fontWeight:
                "600",

            color:
                "#111111",
        },


        wheelSelectionBackground: {
            position:
                "absolute",

            left:
                0,

            right:
                0,

            top:
                WHEEL_ITEM_HEIGHT *
                2,

            height:
            WHEEL_ITEM_HEIGHT,

            borderRadius:
                10,

            backgroundColor:
                "#F4F4F5",
        },


        timeColon: {
            width:
                20,

            textAlign:
                "center",

            fontSize:
                22,

            fontWeight:
                "600",

            color:
                "#111111",

            zIndex:
                3,
        },


        timeConfirmButton: {
            height:
                52,

            marginTop:
                20,

            borderRadius:
                6,

            alignItems:
                "center",

            justifyContent:
                "center",

            backgroundColor:
                "#111111",
        },


        timeConfirmButtonText: {
            fontSize:
                16,

            fontWeight:
                "600",

            color:
                "#FFFFFF",
        },
    });
