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

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    router,
    useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    scheduleNotificationAsync,
} from "expo-notifications/build/scheduleNotificationAsync";

import {
    cancelScheduledNotificationAsync,
} from "expo-notifications/build/cancelScheduledNotificationAsync";

import {
    SchedulableTriggerInputTypes,
} from "expo-notifications/build/Notifications.types";

import { SafeAreaView } from "react-native-safe-area-context";

import { STORAGE_KEYS } from "@/constants/storageKeys";
import { useAuth } from "@/hooks/useAuth";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";

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

type SelectionModalType =
    | "date"
    | "time"
    | "reminder"
    | "repeat"
    | null;

type ReminderOption = {
    label: string;
    value: number | null;
};

type RepeatOption = {
    label: string;
    value: RepeatType;
};

type DateOption = {
    label: string;
    value: Date;
};

/*
 * =====================================================
 * 옵션
 * =====================================================
 */

const REMINDER_OPTIONS:
    ReminderOption[] = [
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

const REPEAT_OPTIONS:
    RepeatOption[] = [
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

const HOURS =
    Array.from(
        {
            length: 12,
        },
        (_, index) =>
            index + 1
    );

const MINUTES =
    Array.from(
        {
            length: 60,
        },
        (_, index) =>
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

function startOfDay(
    date: Date
) {
    const result =
        new Date(date);

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}

function isSameDay(
    first: Date,
    second: Date
) {
    return (
        first.getFullYear() ===
        second.getFullYear() &&
        first.getMonth() ===
        second.getMonth() &&
        first.getDate() ===
        second.getDate()
    );
}

function createDateOptions(
    selectedDate: Date
): DateOption[] {
    const today =
        startOfDay(
            new Date()
        );

    const options:
        DateOption[] = [];

    /*
     * 현재 날짜부터 앞으로 30일
     */
    for (
        let index = 0;
        index < 30;
        index += 1
    ) {
        const date =
            new Date(
                today
            );

        date.setDate(
            today.getDate() +
            index
        );

        let prefix =
            "";

        if (
            index === 0
        ) {
            prefix =
                "오늘 · ";
        } else if (
            index === 1
        ) {
            prefix =
                "내일 · ";
        } else if (
            index === 2
        ) {
            prefix =
                "모레 · ";
        }

        options.push({
            label:
                `${prefix}${formatDate(
                    date
                )}`,

            value:
            date,
        });
    }

    /*
     * 수정 중인 기존 일정 날짜가
     * 기본 30일 범위 밖이라면
     * 기존 날짜도 선택 목록에 포함합니다.
     */
    const hasSelectedDate =
        options.some(
            (
                option
            ) =>
                isSameDay(
                    option.value,
                    selectedDate
                )
        );

    if (
        !hasSelectedDate
    ) {
        options.unshift({
            label:
                formatDate(
                    selectedDate
                ),

            value:
                startOfDay(
                    selectedDate
                ),
        });
    }

    return options;
}

function formatDate(
    date: Date
) {
    const year =
        date.getFullYear();

    const month =
        date.getMonth() +
        1;

    const day =
        date.getDate();

    const weekdays = [
        "일",
        "월",
        "화",
        "수",
        "목",
        "금",
        "토",
    ];

    return `${year}.${String(
        month
    ).padStart(
        2,
        "0"
    )}.${String(
        day
    ).padStart(
        2,
        "0"
    )} (${weekdays[
        date.getDay()
        ]})`;
}

/*
 * =====================================================
 * 시간
 * =====================================================
 */

function formatTime(
    date: Date
) {
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

function getPeriod(
    date: Date
):
    | "오전"
    | "오후" {
    return date.getHours() <
    12
        ? "오전"
        : "오후";
}

function getDisplayHour(
    date: Date
) {
    const hour =
        date.getHours();

    return hour % 12 === 0
        ? 12
        : hour % 12;
}

function createScheduledDate(
    date: Date,
    period:
        | "오전"
        | "오후",
    displayHour: number,
    minute: number
) {
    const result =
        new Date(date);

    let hour =
        displayHour %
        12;

    if (
        period ===
        "오후"
    ) {
        hour += 12;
    }

    result.setHours(
        hour,
        minute,
        0,
        0
    );

    return result;
}

/*
 * =====================================================
 * 표시값
 * =====================================================
 */

function formatReminder(
    value:
        number | null
) {
    const option =
        REMINDER_OPTIONS.find(
            (
                item
            ) =>
                item.value ===
                value
        );

    return (
        option?.label ??
        "알림 없음"
    );
}

function formatRepeat(
    value:
    RepeatType
) {
    const option =
        REPEAT_OPTIONS.find(
            (
                item
            ) =>
                item.value ===
                value
        );

    return (
        option?.label ??
        "반복 없음"
    );
}

/*
 * =====================================================
 * Screen
 * =====================================================
 */

export default function ScheduleEditScreen() {
    const {
        session,
    } =
        useAuth();

    const {
        scheduleId,
    } =
        useLocalSearchParams<{
            scheduleId?: string;
        }>();

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        originalSchedule,
        setOriginalSchedule,
    ] =
        useState<
            LocalSchedule | null
        >(
            null
        );

    const [
        title,
        setTitle,
    ] =
        useState(
            ""
        );

    const [
        memo,
        setMemo,
    ] =
        useState(
            ""
        );

    const [
        selectedDate,
        setSelectedDate,
    ] =
        useState(
            new Date()
        );

    const [
        period,
        setPeriod,
    ] =
        useState<
            | "오전"
            | "오후"
        >(
            "오전"
        );

    const [
        hour,
        setHour,
    ] =
        useState(
            9
        );

    const [
        minute,
        setMinute,
    ] =
        useState(
            0
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
        repeatType,
        setRepeatType,
    ] =
        useState<
            RepeatType
        >(
            "none"
        );

    const [
        selectionModal,
        setSelectionModal,
    ] =
        useState<
            SelectionModalType
        >(
            null
        );

    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );

    /*
     * =====================================================
     * 일정 불러오기
     * =====================================================
     */

    useEffect(
        () => {
            let mounted =
                true;

            const loadSchedule =
                async () => {
                    if (
                        !scheduleId
                    ) {
                        Alert.alert(
                            "일정을 찾을 수 없어요",
                            "수정할 일정 정보가 없습니다.",
                            [
                                {
                                    text:
                                        "확인",

                                    onPress:
                                        () =>
                                            router.back(),
                                },
                            ]
                        );

                        return;
                    }

                    try {
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
                            throw new Error(
                                "저장된 일정이 없습니다."
                            );
                        }

                        const parsed =
                            JSON.parse(
                                storedSchedules
                            );

                        if (
                            !Array.isArray(
                                parsed
                            )
                        ) {
                            throw new Error(
                                "일정 데이터 형식이 올바르지 않습니다."
                            );
                        }

                        const foundSchedule:
                            LocalSchedule | undefined =
                            parsed.find(
                                (
                                    schedule:
                                    LocalSchedule
                                ) =>
                                    schedule.id ===
                                    scheduleId
                            );

                        if (
                            !foundSchedule
                        ) {
                            throw new Error(
                                "수정할 일정을 찾을 수 없습니다."
                            );
                        }

                        if (
                            !mounted
                        ) {
                            return;
                        }

                        const scheduledDate =
                            new Date(
                                foundSchedule.scheduledAt
                            );

                        const normalizedSchedule:
                            LocalSchedule = {
                            ...foundSchedule,

                            repeatType:
                                foundSchedule.repeatType ??
                                "none",

                            status:
                                foundSchedule.status ??
                                (
                                    foundSchedule.completed
                                        ? "completed"
                                        : "pending"
                                ),

                            completed:
                                (
                                    foundSchedule.status ??
                                    (
                                        foundSchedule.completed
                                            ? "completed"
                                            : "pending"
                                    )
                                ) ===
                                "completed",
                        };

                        setOriginalSchedule(
                            normalizedSchedule
                        );

                        setTitle(
                            normalizedSchedule.title
                        );

                        setMemo(
                            normalizedSchedule.memo ??
                            ""
                        );

                        setSelectedDate(
                            scheduledDate
                        );

                        setPeriod(
                            getPeriod(
                                scheduledDate
                            )
                        );

                        setHour(
                            getDisplayHour(
                                scheduledDate
                            )
                        );

                        setMinute(
                            scheduledDate.getMinutes()
                        );

                        setReminderMinutes(
                            normalizedSchedule.reminderMinutes ??
                            null
                        );

                        setRepeatType(
                            normalizedSchedule.repeatType ??
                            "none"
                        );
                    } catch (
                        error
                        ) {
                        console.error(
                            "일정 수정 데이터 불러오기 오류:",
                            error
                        );

                        Alert.alert(
                            "일정을 불러오지 못했어요",
                            "잠시 후 다시 시도해 주세요.",
                            [
                                {
                                    text:
                                        "확인",

                                    onPress:
                                        () =>
                                            router.back(),
                                },
                            ]
                        );
                    } finally {
                        if (
                            mounted
                        ) {
                            setLoading(
                                false
                            );
                        }
                    }
                };

            void loadSchedule();

            return () => {
                mounted =
                    false;
            };
        },
        [
            scheduleId,
            session
                ?.user
                .id,
        ]
    );

    /*
     * =====================================================
     * 날짜 선택 옵션
     * =====================================================
     */

    const dateOptions =
        useMemo(
            () =>
                createDateOptions(
                    selectedDate
                ),
            [
                selectedDate,
            ]
        );

    /*
     * =====================================================
     * 현재 선택된 일정 시간
     * =====================================================
     */

    const currentScheduledDate =
        useMemo(
            () =>
                createScheduledDate(
                    selectedDate,
                    period,
                    hour,
                    minute
                ),
            [
                selectedDate,
                period,
                hour,
                minute,
            ]
        );

    /*
     * =====================================================
     * 저장
     * =====================================================
     */

    const handleSave =
        async () => {
            if (
                saving ||
                !originalSchedule
            ) {
                return;
            }

            const trimmedTitle =
                title.trim();

            if (
                trimmedTitle.length ===
                0
            ) {
                Alert.alert(
                    "제목을 입력해 주세요",
                    "일정 제목은 필수예요."
                );

                return;
            }

            /*
             * 기존 일정의 날짜/시간을 실제로 변경한 경우에만
             * '최소 30분 후' 정책을 적용합니다.
             *
             * 예:
             * 일정이 10분 뒤인데 메모만 수정하는 경우
             * 저장을 막지 않습니다.
             */
            const originalTime =
                new Date(
                    originalSchedule.scheduledAt
                ).getTime();

            const nextTime =
                currentScheduledDate.getTime();

            const scheduleTimeChanged =
                originalTime !==
                nextTime;

            if (
                scheduleTimeChanged
            ) {
                const minimumDate =
                    new Date(
                        Date.now() +
                        30 *
                        60 *
                        1000
                    );

                if (
                    currentScheduledDate.getTime() <
                    minimumDate.getTime()
                ) {
                    Alert.alert(
                        "시간을 다시 선택해 주세요",
                        "최소 30분 후의 시간을 선택해 주세요."
                    );

                    return;
                }
            }

            const oldReminder =
                originalSchedule.reminderMinutes ??
                null;

            const notificationSettingChanged =
                scheduleTimeChanged ||
                oldReminder !==
                reminderMinutes;

            setSaving(
                true
            );

            let newNotificationId:
                string | null =
                originalSchedule.localNotificationId ??
                null;

            let newlyScheduledNotificationId:
                string | null =
                null;

            let notificationSchedulingFailed =
                false;

            try {
                /*
                 * =====================================================
                 * 알림 재예약
                 *
                 * 일정 시간 또는 알림 설정이 변경된 경우에만
                 * 새로운 알림을 예약합니다.
                 * =====================================================
                 */

                if (
                    notificationSettingChanged
                ) {
                    newNotificationId =
                        null;

                    if (
                        reminderMinutes !==
                        null
                    ) {
                        const notificationDate =
                            new Date(
                                currentScheduledDate.getTime() -
                                reminderMinutes *
                                60 *
                                1000
                            );

                        /*
                         * 알림 시간이 이미 지난 경우
                         * 잘못된 즉시 알림을 만들지 않습니다.
                         */
                        if (
                            notificationDate.getTime() >
                            Date.now()
                        ) {
                            try {
                                newlyScheduledNotificationId =
                                    await scheduleNotificationAsync(
                                        {
                                            content: {
                                                title:
                                                trimmedTitle,

                                                body:
                                                    "예정된 일정이 있어요.",

                                                data: {
                                                    scheduleId:
                                                    originalSchedule.id,
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

                                newNotificationId =
                                    newlyScheduledNotificationId;
                            } catch (
                                notificationError
                                ) {
                                console.error(
                                    "수정 일정 알림 예약 오류:",
                                    notificationError
                                );

                                notificationSchedulingFailed =
                                    true;

                                newNotificationId =
                                    null;
                            }
                        } else {
                            /*
                             * 예:
                             * 일정은 40분 뒤인데
                             * 1시간 전 알림으로 수정한 경우.
                             */
                            notificationSchedulingFailed =
                                true;
                        }
                    }
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

                const parsedSchedules:
                    LocalSchedule[] =
                    storedSchedules
                        ? JSON.parse(
                            storedSchedules
                        )
                        : [];

                if (
                    !Array.isArray(
                        parsedSchedules
                    )
                ) {
                    throw new Error(
                        "저장된 일정 데이터가 올바르지 않습니다."
                    );
                }

                const updatedSchedule:
                    LocalSchedule = {
                    ...originalSchedule,

                    /*
                     * 기존 ID와 상태는 유지합니다.
                     */
                    id:
                    originalSchedule.id,

                    status:
                    originalSchedule.status,

                    completed:
                        originalSchedule.status ===
                        "completed",

                    title:
                    trimmedTitle,

                    memo:
                        memo.trim()
                            .length >
                        0
                            ? memo.trim()
                            : null,

                    scheduledAt:
                        currentScheduledDate.toISOString(),

                    reminderMinutes,

                    repeatType,

                    localNotificationId:
                        notificationSettingChanged
                            ? newNotificationId
                            : originalSchedule.localNotificationId ??
                            null,
                };

                const updatedSchedules =
                    parsedSchedules.map(
                        (
                            schedule
                        ) =>
                            schedule.id ===
                            originalSchedule.id
                                ? updatedSchedule
                                : schedule
                    );

                await AsyncStorage.setItem(
                    storageKey,
                    JSON.stringify(
                        updatedSchedules
                    )
                );

                /*
                 * 새로운 데이터를 정상 저장한 뒤에
                 * 기존 알림을 취소합니다.
                 *
                 * Storage 저장이 실패했을 때
                 * 기존 알림까지 먼저 사라지는 문제를 피하기 위함입니다.
                 */
                if (
                    notificationSettingChanged &&
                    originalSchedule.localNotificationId &&
                    originalSchedule.localNotificationId !==
                    newNotificationId
                ) {
                    try {
                        await cancelScheduledNotificationAsync(
                            originalSchedule.localNotificationId
                        );
                    } catch (
                        notificationCancelError
                        ) {
                        console.error(
                            "기존 일정 알림 취소 오류:",
                            notificationCancelError
                        );
                    }
                }

                if (
                    notificationSchedulingFailed
                ) {
                    Alert.alert(
                        "일정은 수정됐어요",
                        "다만 선택한 알림 시간은 예약하지 못했어요.",
                        [
                            {
                                text:
                                    "확인",

                                onPress:
                                    () =>
                                        router.replace(
                                            "/"
                                        ),
                            },
                        ]
                    );

                    return;
                }

                router.replace(
                    "/"
                );
            } catch (
                error
                ) {
                console.error(
                    "일정 수정 저장 오류:",
                    error
                );

                /*
                 * 새 알림까지 만든 뒤 Storage 저장이 실패했다면
                 * 방금 만든 새 알림을 제거해서
                 * 고아 알림이 남지 않게 합니다.
                 */
                if (
                    newlyScheduledNotificationId
                ) {
                    try {
                        await cancelScheduledNotificationAsync(
                            newlyScheduledNotificationId
                        );
                    } catch (
                        notificationRollbackError
                        ) {
                        console.error(
                            "신규 알림 롤백 오류:",
                            notificationRollbackError
                        );
                    }
                }

                Alert.alert(
                    "일정을 수정하지 못했어요",
                    "잠시 후 다시 시도해 주세요."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    if (
        loading
    ) {
        return (
            <AppLoadingScreen />
        );
    }

    if (
        !originalSchedule
    ) {
        return null;
    }

    return (
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
                 * Header
                 * =====================================================
                 */}
                <View
                    style={
                        styles.header
                    }
                >
                    <Pressable
                        style={
                            styles.headerIconButton
                        }
                        onPress={() =>
                            router.back()
                        }
                        hitSlop={10}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={27}
                            color="#111111"
                        />
                    </Pressable>

                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        일정 수정
                    </Text>

                    <View
                        style={
                            styles.headerSpacer
                        }
                    />
                </View>

                <ScrollView
                    style={
                        styles.scrollView
                    }
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    {/*
                     * =====================================================
                     * 제목
                     * =====================================================
                     */}
                    <View
                        style={
                            styles.fieldGroup
                        }
                    >
                        <Text
                            style={
                                styles.fieldLabel
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
                            placeholderTextColor="#A4A6AC"
                            maxLength={100}
                        />
                    </View>

                    {/*
                     * =====================================================
                     * 날짜
                     * =====================================================
                     */}
                    <SettingRow
                        icon="calendar-outline"
                        label="날짜"
                        value={formatDate(
                            selectedDate
                        )}
                        onPress={() =>
                            setSelectionModal(
                                "date"
                            )
                        }
                    />

                    {/*
                     * =====================================================
                     * 시간
                     * =====================================================
                     */}
                    <SettingRow
                        icon="time-outline"
                        label="시간"
                        value={formatTime(
                            currentScheduledDate
                        )}
                        onPress={() =>
                            setSelectionModal(
                                "time"
                            )
                        }
                    />

                    {/*
                     * =====================================================
                     * 알림
                     * =====================================================
                     */}
                    <SettingRow
                        icon="notifications-outline"
                        label="알림"
                        value={formatReminder(
                            reminderMinutes
                        )}
                        onPress={() =>
                            setSelectionModal(
                                "reminder"
                            )
                        }
                    />

                    {/*
                     * =====================================================
                     * 반복
                     * =====================================================
                     */}
                    <SettingRow
                        icon="repeat-outline"
                        label="반복"
                        value={formatRepeat(
                            repeatType
                        )}
                        onPress={() =>
                            setSelectionModal(
                                "repeat"
                            )
                        }
                    />

                    {repeatType ===
                        "weekday" && (
                            <View
                                style={
                                    styles.weekdayInfo
                                }
                            >
                                <Ionicons
                                    name="information-circle-outline"
                                    size={18}
                                    color="#B96F72"
                                />

                                <Text
                                    style={
                                        styles.weekdayInfoText
                                    }
                                >
                                    공휴일 포함 월~금 반복해요.
                                </Text>
                            </View>
                        )}

                    {/*
                     * =====================================================
                     * 메모
                     * =====================================================
                     */}
                    <View
                        style={
                            styles.memoGroup
                        }
                    >
                        <Text
                            style={
                                styles.fieldLabel
                            }
                        >
                            메모
                        </Text>

                        <View
                            style={
                                styles.memoInputContainer
                            }
                        >
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
                                placeholderTextColor="#A4A6AC"
                                multiline
                                textAlignVertical="top"
                                maxLength={500}
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
                </ScrollView>

                {/*
                 * =====================================================
                 * 저장
                 * =====================================================
                 */}
                <View
                    style={
                        styles.bottomArea
                    }
                >
                    <Pressable
                        style={[
                            styles.saveButton,

                            saving &&
                            styles.saveButtonDisabled,
                        ]}
                        onPress={() =>
                            void handleSave()
                        }
                        disabled={
                            saving
                        }
                    >
                        <Text
                            style={
                                styles.saveButtonText
                            }
                        >
                            {saving
                                ? "저장 중..."
                                : "수정 완료"}
                        </Text>
                    </Pressable>
                </View>

                {/*
                 * =====================================================
                 * 날짜 Modal
                 * =====================================================
                 */}
                <SelectionModal
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
                    <ScrollView
                        style={
                            styles.dateOptionScroll
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        {dateOptions.map(
                            (
                                option
                            ) => {
                                const selected =
                                    isSameDay(
                                        option.value,
                                        selectedDate
                                    );

                                return (
                                    <SelectionOption
                                        key={
                                            option.value.toISOString()
                                        }
                                        label={
                                            option.label
                                        }
                                        selected={
                                            selected
                                        }
                                        onPress={() => {
                                            const nextDate =
                                                new Date(
                                                    option.value
                                                );

                                            nextDate.setHours(
                                                selectedDate.getHours(),
                                                selectedDate.getMinutes(),
                                                0,
                                                0
                                            );

                                            setSelectedDate(
                                                nextDate
                                            );

                                            setSelectionModal(
                                                null
                                            );
                                        }}
                                    />
                                );
                            }
                        )}
                    </ScrollView>
                </SelectionModal>

                {/*
                 * =====================================================
                 * 시간 Modal
                 * =====================================================
                 */}
                <SelectionModal
                    visible={
                        selectionModal ===
                        "time"
                    }
                    title="시간 선택"
                    onClose={() =>
                        setSelectionModal(
                            null
                        )
                    }
                >
                    <View
                        style={
                            styles.timePicker
                        }
                    >
                        <PickerColumn
                            values={[
                                "오전",
                                "오후",
                            ]}
                            selectedValue={
                                period
                            }
                            onSelect={(
                                value
                            ) =>
                                setPeriod(
                                    value as
                                        | "오전"
                                        | "오후"
                                )
                            }
                        />

                        <PickerColumn
                            values={HOURS.map(
                                String
                            )}
                            selectedValue={String(
                                hour
                            )}
                            onSelect={(
                                value
                            ) =>
                                setHour(
                                    Number(
                                        value
                                    )
                                )
                            }
                        />

                        <PickerColumn
                            values={MINUTES.map(
                                (
                                    value
                                ) =>
                                    String(
                                        value
                                    ).padStart(
                                        2,
                                        "0"
                                    )
                            )}
                            selectedValue={String(
                                minute
                            ).padStart(
                                2,
                                "0"
                            )}
                            onSelect={(
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
                            styles.modalConfirmButton
                        }
                        onPress={() =>
                            setSelectionModal(
                                null
                            )
                        }
                    >
                        <Text
                            style={
                                styles.modalConfirmButtonText
                            }
                        >
                            확인
                        </Text>
                    </Pressable>
                </SelectionModal>

                {/*
                 * =====================================================
                 * 알림 Modal
                 * =====================================================
                 */}
                <SelectionModal
                    visible={
                        selectionModal ===
                        "reminder"
                    }
                    title="알림 설정"
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
                            <SelectionOption
                                key={
                                    option.value ??
                                    "none"
                                }
                                label={
                                    option.label
                                }
                                selected={
                                    reminderMinutes ===
                                    option.value
                                }
                                onPress={() => {
                                    setReminderMinutes(
                                        option.value
                                    );

                                    setSelectionModal(
                                        null
                                    );
                                }}
                            />
                        )
                    )}
                </SelectionModal>

                {/*
                 * =====================================================
                 * 반복 Modal
                 * =====================================================
                 */}
                <SelectionModal
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
                            <SelectionOption
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
                                onPress={() => {
                                    setRepeatType(
                                        option.value
                                    );

                                    setSelectionModal(
                                        null
                                    );
                                }}
                            />
                        )
                    )}
                </SelectionModal>
            </View>
        </SafeAreaView>
    );
}

/*
 * =====================================================
 * 설정 Row
 * =====================================================
 */

function SettingRow({
                        icon,
                        label,
                        value,
                        onPress,
                    }: {
    icon:
        keyof typeof Ionicons.glyphMap;

    label:
        string;

    value:
        string;

    onPress:
        () => void;
}) {
    return (
        <Pressable
            style={
                styles.settingRow
            }
            onPress={
                onPress
            }
        >
            <View
                style={
                    styles.settingLabelArea
                }
            >
                <Ionicons
                    name={
                        icon
                    }
                    size={21}
                    color="#666A72"
                />

                <Text
                    style={
                        styles.settingLabel
                    }
                >
                    {
                        label
                    }
                </Text>
            </View>

            <View
                style={
                    styles.settingValueArea
                }
            >
                <Text
                    style={
                        styles.settingValue
                    }
                >
                    {
                        value
                    }
                </Text>

                <Ionicons
                    name="chevron-forward"
                    size={19}
                    color="#A4A6AC"
                />
            </View>
        </Pressable>
    );
}

/*
 * =====================================================
 * 공통 선택 Modal
 * =====================================================
 */

function SelectionModal({
                            visible,
                            title,
                            onClose,
                            children,
                        }: {
    visible:
        boolean;

    title:
        string;

    onClose:
        () => void;

    children:
        React.ReactNode;
}) {
    return (
        <Modal
            visible={
                visible
            }
            transparent
            animationType="slide"
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
                        styles.modalSheet
                    }
                >
                    <View
                        style={
                            styles.modalHeader
                        }
                    >
                        <Text
                            style={
                                styles.modalTitle
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
                            hitSlop={10}
                        >
                            <Ionicons
                                name="close"
                                size={25}
                                color="#111111"
                            />
                        </Pressable>
                    </View>

                    {
                        children
                    }
                </View>
            </View>
        </Modal>
    );
}

/*
 * =====================================================
 * 선택 Option
 * =====================================================
 */

function SelectionOption({
                             label,
                             selected,
                             onPress,
                         }: {
    label:
        string;

    selected:
        boolean;

    onPress:
        () => void;
}) {
    return (
        <Pressable
            style={
                styles.selectionOption
            }
            onPress={
                onPress
            }
        >
            <Text
                style={[
                    styles.selectionOptionText,

                    selected &&
                    styles.selectionOptionTextSelected,
                ]}
            >
                {
                    label
                }
            </Text>

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
        </Pressable>
    );
}

/*
 * =====================================================
 * 시간 Picker Column
 * =====================================================
 */

function PickerColumn({
                          values,
                          selectedValue,
                          onSelect,
                      }: {
    values:
        string[];

    selectedValue:
        string;

    onSelect:
        (
            value:
            string
        ) => void;
}) {
    return (
        <ScrollView
            style={
                styles.pickerColumn
            }
            contentContainerStyle={
                styles.pickerColumnContent
            }
            showsVerticalScrollIndicator={
                false
            }
        >
            {values.map(
                (
                    value
                ) => {
                    const selected =
                        selectedValue ===
                        value;

                    return (
                        <Pressable
                            key={
                                value
                            }
                            style={[
                                styles.pickerItem,

                                selected &&
                                styles.pickerItemSelected,
                            ]}
                            onPress={() =>
                                onSelect(
                                    value
                                )
                            }
                        >
                            <Text
                                style={[
                                    styles.pickerItemText,

                                    selected &&
                                    styles.pickerItemTextSelected,
                                ]}
                            >
                                {
                                    value
                                }
                            </Text>
                        </Pressable>
                    );
                }
            )}
        </ScrollView>
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
                "#FFFFFF",
        },

        container: {
            flex: 1,
            backgroundColor:
                "#FFFFFF",
        },

        header: {
            height: 64,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            borderBottomWidth: 1,
            borderBottomColor:
                "#F0F0F1",
        },

        headerIconButton: {
            width: 36,
            height: 36,
            alignItems: "flex-start",
            justifyContent: "center",
        },

        headerTitle: {
            fontSize: 18,
            fontWeight: "700",
            color: "#111111",
        },

        headerSpacer: {
            width: 36,
        },

        scrollView: {
            flex: 1,
        },

        scrollContent: {
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 40,
        },

        fieldGroup: {
            marginBottom: 12,
        },

        fieldLabel: {
            marginBottom: 10,
            fontSize: 14,
            fontWeight: "600",
            color: "#55585F",
        },

        titleInput: {
            minHeight: 54,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor:
                "#E3E4E7",
            borderRadius: 10,
            fontSize: 16,
            color: "#111111",
            backgroundColor:
                "#FFFFFF",
        },

        settingRow: {
            minHeight: 64,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            borderBottomWidth: 1,
            borderBottomColor:
                "#EFEFF1",
        },

        settingLabelArea: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },

        settingLabel: {
            fontSize: 15,
            fontWeight: "500",
            color: "#333333",
        },

        settingValueArea: {
            flex: 1,
            marginLeft: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "flex-end",
            gap: 5,
        },

        settingValue: {
            flexShrink: 1,
            fontSize: 14,
            color: "#777B84",
            textAlign: "right",
        },

        weekdayInfo: {
            marginTop: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor:
                "#FFF3F3",
        },

        weekdayInfoText: {
            flex: 1,
            fontSize: 13,
            lineHeight: 19,
            color: "#A86568",
        },

        memoGroup: {
            marginTop: 30,
        },

        memoInputContainer: {
            minHeight: 150,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
            borderWidth: 1,
            borderColor:
                "#E3E4E7",
            borderRadius: 10,
        },

        memoInput: {
            minHeight: 100,
            padding: 0,
            fontSize: 15,
            lineHeight: 22,
            color: "#111111",
        },

        memoCount: {
            marginTop: 8,
            fontSize: 12,
            color: "#A4A6AC",
            textAlign: "right",
        },

        bottomArea: {
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor:
                "#F0F0F1",
            backgroundColor:
                "#FFFFFF",
        },

        saveButton: {
            height: 56,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                "#111111",
        },

        saveButtonDisabled: {
            opacity: 0.6,
        },

        saveButtonText: {
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
        },

        modalOverlay: {
            flex: 1,
            justifyContent:
                "flex-end",
            backgroundColor:
                "rgba(0, 0, 0, 0.35)",
        },

        modalSheet: {
            maxHeight: "74%",
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 30,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor:
                "#FFFFFF",
        },

        modalHeader: {
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
        },

        modalTitle: {
            fontSize: 19,
            fontWeight: "700",
            color: "#111111",
        },

        selectionOption: {
            minHeight: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            borderBottomWidth: 1,
            borderBottomColor:
                "#F0F0F1",
        },

        selectionOptionText: {
            fontSize: 16,
            color: "#44474D",
        },

        selectionOptionTextSelected: {
            fontWeight: "600",
            color: "#111111",
        },

        radioOuter: {
            width: 22,
            height: 22,
            borderWidth: 2,
            borderColor:
                "#C6C8CD",
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
        },

        radioOuterSelected: {
            borderColor:
                "#111111",
        },

        radioInner: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor:
                "#111111",
        },

        dateOptionScroll: {
            maxHeight: 430,
        },

        timePicker: {
            height: 280,
            flexDirection: "row",
            gap: 10,
        },

        pickerColumn: {
            flex: 1,
        },

        pickerColumnContent: {
            paddingVertical: 4,
        },

        pickerItem: {
            minHeight: 48,
            marginVertical: 3,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
        },

        pickerItemSelected: {
            backgroundColor:
                "#F3F3F4",
        },

        pickerItemText: {
            fontSize: 16,
            color: "#777B84",
        },

        pickerItemTextSelected: {
            fontWeight: "700",
            color: "#111111",
        },

        modalConfirmButton: {
            height: 52,
            marginTop: 18,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                "#111111",
        },

        modalConfirmButtonText: {
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
        },
    });