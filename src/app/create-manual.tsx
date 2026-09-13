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


import { STORAGE_KEYS } from "@/constants/storageKeys";
import { useAuth } from "@/hooks/useAuth";


/*
 * =====================================================
 * Local Notification 설정
 * =====================================================
 */

/*
 * 앱 실행 중에도
 * Local Notification을 화면에 표시합니다.
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

type LocalSchedule = {
    id: string;

    title: string;

    memo: string | null;

    scheduledAt: string;

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
    | null;


type DateOption = {
    label: string;
    value: Date;
};


type ReminderOption = {
    label: string;
    value: number | null;
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
 *
 * 예:
 *
 * 현재 10:20:00
 * → 10:50 가능
 *
 * 현재 10:20:30
 * → 10:50은 30분 미만
 * → 10:51부터 가능
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
 * Local Notification
 * =====================================================
 */

/*
 * 알림 권한 확인
 *
 * 이미 허용되어 있으면 그대로 진행하고,
 * 허용되어 있지 않으면 시스템 권한을 요청합니다.
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
 * 딱 1회만 예약합니다.
 *
 * 예:
 *
 * 일정 시각
 * → 20:40
 *
 * 알림
 * → 10분 전
 *
 * 실제 알림
 * → 20:30
 */
async function scheduleLocalNotification(
    scheduleId: string,
    title: string,
    scheduledDate: Date,
    reminderMinutes: number | null
) {
    /*
     * "알림 없음"이면
     * 예약하지 않습니다.
     */
    if (
        reminderMinutes === null
    ) {
        return null;
    }


    /*
     * 알림 권한 확인
     */
    const permissionGranted =
        await ensureNotificationPermission();


    if (
        !permissionGranted
    ) {
        throw new Error(
            "Notification permission denied."
        );
    }


    /*
     * 실제 Local Notification 발생 시각
     */
    const notificationDate =
        new Date(
            scheduledDate.getTime() -
            reminderMinutes *
            60 *
            1000
        );


    /*
     * 알림 발생 시각이
     * 이미 지나간 경우에는 예약할 수 없습니다.
     */
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


    /*
     * 지정된 시각에
     * 한 번만 실행되는 Local Notification
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


    /*
     * 일정 메모
     *
     * 선택 입력값입니다.
     */
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


                /*
                 * 초가 남아 있으면
                 * 다음 분으로 올립니다.
                 */
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


    /*
     * 제목은 필수입니다.
     *
     * 메모는 선택사항입니다.
     */
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


            /*
             * 사용자가 화면에 오래 머물렀을 수 있으므로
             * 저장 직전에도 최소 30분 조건을 다시 검사합니다.
             */
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
                /*
                 * 실제 일정 날짜 + 시간 생성
                 */
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


                /*
                 * 현재 사용자에 맞는
                 * AsyncStorage Key
                 */
                const storageKey =
                    getScheduleStorageKey(
                        session?.user.id
                    );


                /*
                 * 기존 일정 조회
                 */
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
                        schedules =
                            parsed;
                    }
                }


                /*
                 * 신규 일정 ID
                 */
                const scheduleId =
                    createLocalScheduleId();


                /*
                 * Local Notification 예약 ID
                 */
                let localNotificationId:
                    string | null =
                    null;


                /*
                 * "알림 없음"이 아닌 경우에만
                 * Local Notification 예약
                 */
                if (
                    reminderMinutes !==
                    null
                ) {
                    try {
                        localNotificationId =
                            await scheduleLocalNotification(
                                scheduleId,

                                title.trim(),

                                scheduledDate,

                                reminderMinutes
                            );
                    } catch (
                        notificationError
                        ) {
                        console.error(
                            "로컬 알림 예약 오류:",
                            notificationError
                        );


                        /*
                         * 알림 예약 실패와
                         * 일정 저장 실패는 분리합니다.
                         *
                         * 알림 예약에 실패하더라도
                         * 일정 자체는 저장합니다.
                         */
                        Alert.alert(
                            "알림은 예약하지 못했어요",
                            "일정은 정상적으로 저장합니다."
                        );
                    }
                }


                /*
                 * 신규 일정
                 */
                const newSchedule:
                    LocalSchedule = {
                    id:
                    scheduleId,

                    title:
                        title.trim(),

                    memo:
                        memo.trim() ||
                        null,

                    scheduledAt:
                        scheduledDate.toISOString(),

                    status:
                        "pending",

                    completed:
                        false,

                    reminderMinutes,

                    localNotificationId,
                };


                /*
                 * AsyncStorage 저장
                 */
                await AsyncStorage.setItem(
                    storageKey,

                    JSON.stringify(
                        [
                            ...schedules,
                            newSchedule,
                        ]
                    )
                );


                console.log(
                    "로컬 일정 저장 완료:",
                    newSchedule
                );


                /*
                 * 저장 완료 후 Home 이동
                 */
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
            /*
             * 최소 30분 이후가 아니면
             * 시간 선택 자체를 막습니다.
             */
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


                    {/* 입력 폼 */}
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


                        {/* 메모 */}
                        <View
                            style={
                                styles.memoRow
                            }
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
                            style={[
                                styles.optionRow,
                                styles.lastOptionRow,
                            ]}
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


                        {/* 오전 / 오후 */}
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


                        {/* 시 */}
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


                        {/* 분 */}
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
                         }: {
    label: string;

    selected: boolean;

    onPress:
        () => void;
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


            {selected && (
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
                28,
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


        form: {
            marginTop:
                36,

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


        /*
         * 메모 입력 영역
         */
        memoRow: {
            minHeight:
                104,

            paddingHorizontal:
                16,

            paddingVertical:
                14,

            flexDirection:
                "row",

            alignItems:
                "flex-start",

            borderBottomWidth:
                1,

            borderBottomColor:
                "#ECEDEF",
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
                74,

            paddingTop:
                0,

            paddingBottom:
                0,

            paddingHorizontal:
                0,

            fontSize:
                15,

            lineHeight:
                22,

            color:
                "#111111",
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
            marginTop:
                "auto",

            paddingBottom:
                16,
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
                20,

            paddingBottom:
                12,

            borderRadius:
                12,

            backgroundColor:
                "#FFFFFF",
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
                52,

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