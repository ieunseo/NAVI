import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    useEffect,
    useMemo,
    useState,
    type ReactNode,
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

import { STORAGE_KEYS } from "../constants/storageKeys";

import { useAuth } from "../hooks/useAuth";

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

type EditScope =
    | "single"
    | "future";

type LocalSchedule = {
    id: string;

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

type DateOption = {
    label: string;
    value: string;
};

type ReminderOption = {
    label: string;
    value: number | null;
};

type RepeatOption = {
    label: string;
    value: RepeatType;
};

/*
 * =====================================================
 * 옵션
 * =====================================================
 */

const REMINDER_OPTIONS:
    ReminderOption[] = [
    {
        label:
            "알림 없음",
        value:
            null,
    },
    {
        label:
            "10분 전",
        value:
            10,
    },
    {
        label:
            "20분 전",
        value:
            20,
    },
    {
        label:
            "30분 전",
        value:
            30,
    },
    {
        label:
            "1시간 전",
        value:
            60,
    },
    {
        label:
            "2시간 전",
        value:
            120,
    },
];

const REPEAT_OPTIONS:
    RepeatOption[] = [
    {
        label:
            "반복 없음",
        value:
            "none",
    },
    {
        label:
            "매일",
        value:
            "daily",
    },
    {
        label:
            "평일",
        value:
            "weekday",
    },
    {
        label:
            "매주",
        value:
            "weekly",
    },
];

const PERIOD_OPTIONS = [
    "오전",
    "오후",
] as const;

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
 * 데이터 보정
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

        reminderMinutes:
            schedule.reminderMinutes ??
            null,

        localNotificationId:
            schedule.localNotificationId ??
            null,
    };
}

/*
 * =====================================================
 * 날짜
 * =====================================================
 */

function startOfDay(
    date:
    Date
) {
    const next =
        new Date(
            date
        );

    next.setHours(
        0,
        0,
        0,
        0
    );

    return next;
}

function formatDateLabel(
    date:
    Date
) {
    const month =
        date.getMonth() +
        1;

    const day =
        date.getDate();

    const weekday =
        [
            "일",
            "월",
            "화",
            "수",
            "목",
            "금",
            "토",
        ][
            date.getDay()
            ];

    return `${month}월 ${day}일 (${weekday})`;
}

function createDateOptions(
    selectedDate:
    Date
): DateOption[] {
    const today =
        startOfDay(
            new Date()
        );

    const options:
        DateOption[] = [];

    for (
        let index = 0;
        index <= 30;
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

        let label =
            formatDateLabel(
                date
            );

        if (
            index === 0
        ) {
            label =
                `오늘 · ${label}`;
        } else if (
            index === 1
        ) {
            label =
                `내일 · ${label}`;
        } else if (
            index === 2
        ) {
            label =
                `모레 · ${label}`;
        }

        options.push({
            label,
            value:
                date.toISOString(),
        });
    }

    const selectedDay =
        startOfDay(
            selectedDate
        );

    const exists =
        options.some(
            (
                option
            ) =>
                startOfDay(
                    new Date(
                        option.value
                    )
                ).getTime() ===
                selectedDay.getTime()
        );

    if (
        !exists
    ) {
        options.unshift({
            label:
                formatDateLabel(
                    selectedDate
                ),

            value:
                selectedDay.toISOString(),
        });
    }

    return options;
}

/*
 * =====================================================
 * 시간
 * =====================================================
 */

function convertTo12Hour(
    date:
    Date
) {
    const hour24 =
        date.getHours();

    const period:
        "오전" | "오후" =
        hour24 < 12
            ? "오전"
            : "오후";

    const hour =
        hour24 % 12 ===
        0
            ? 12
            : hour24 % 12;

    return {
        period,
        hour,
        minute:
            date.getMinutes(),
    };
}

function convertTo24Hour(
    period:
        "오전" | "오후",
    hour:
    number
) {
    if (
        period ===
        "오전"
    ) {
        return hour ===
        12
            ? 0
            : hour;
    }

    return hour ===
    12
        ? 12
        : hour + 12;
}

function createScheduledDate(
    date:
    Date,
    period:
        "오전" | "오후",
    hour:
    number,
    minute:
    number
) {
    const nextDate =
        new Date(
            date
        );

    const hour24 =
        convertTo24Hour(
            period,
            hour
        );

    nextDate.setHours(
        hour24,
        minute,
        0,
        0
    );

    return nextDate;
}

/*
 * =====================================================
 * 알림
 * =====================================================
 */

async function createNotification(
    schedule:
    LocalSchedule
) {
    if (
        schedule.reminderMinutes ==
        null
    ) {
        return null;
    }

    const scheduledDate =
        new Date(
            schedule.scheduledAt
        );

    const notificationDate =
        new Date(
            scheduledDate.getTime() -
            schedule.reminderMinutes *
            60 *
            1000
        );

    if (
        notificationDate.getTime() <=
        Date.now()
    ) {
        return null;
    }

    return await scheduleNotificationAsync({
        content: {
            title:
            schedule.title,

            body:
                "예정된 일정이 곧 시작돼요.",

            sound:
                true,
        },

        trigger: {
            type:
            SchedulableTriggerInputTypes.DATE,

            date:
            notificationDate,
        },
    });
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

    const params =
        useLocalSearchParams<{
            scheduleId?:
                string;

            editScope?:
                string;
        }>();

    const scheduleId =
        typeof params.scheduleId ===
        "string"
            ? params.scheduleId
            : undefined;

    const editScope:
        EditScope =
        params.editScope ===
        "future"
            ? "future"
            : "single";

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
        originalSchedule,
        setOriginalSchedule,
    ] =
        useState<
            LocalSchedule | null
        >(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        saving,
        setSaving,
    ] =
        useState(
            false
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
            "오전" | "오후"
        >(
            "오전"
        );

    const [
        hour,
        setHour,
    ] =
        useState(
            12
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

    /*
     * =====================================================
     * 일정 로드
     * =====================================================
     */

    useEffect(
        () => {
            let mounted =
                true;

            const loadSchedule =
                async () => {
                    try {
                        if (
                            !scheduleId
                        ) {
                            Alert.alert(
                                "일정을 찾지 못했어요",
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

                        const storageKey =
                            getScheduleStorageKey(
                                session
                                    ?.user
                                    .id
                            );

                        const stored =
                            await AsyncStorage.getItem(
                                storageKey
                            );

                        if (
                            !stored
                        ) {
                            throw new Error(
                                "stored schedule not found"
                            );
                        }

                        const parsed =
                            JSON.parse(
                                stored
                            );

                        if (
                            !Array.isArray(
                                parsed
                            )
                        ) {
                            throw new Error(
                                "invalid stored schedules"
                            );
                        }

                        const normalized:
                            LocalSchedule[] =
                            parsed.map(
                                (
                                    schedule
                                ) =>
                                    normalizeSchedule(
                                        schedule
                                    )
                            );

                        const target =
                            normalized.find(
                                (
                                    schedule
                                ) =>
                                    schedule.id ===
                                    scheduleId
                            );

                        if (
                            !target
                        ) {
                            throw new Error(
                                "target schedule not found"
                            );
                        }

                        if (
                            !mounted
                        ) {
                            return;
                        }

                        setSchedules(
                            normalized
                        );

                        setOriginalSchedule(
                            target
                        );

                        setTitle(
                            target.title
                        );

                        setMemo(
                            target.memo ??
                            ""
                        );

                        const scheduledDate =
                            new Date(
                                target.scheduledAt
                            );

                        setSelectedDate(
                            scheduledDate
                        );

                        const converted =
                            convertTo12Hour(
                                scheduledDate
                            );

                        setPeriod(
                            converted.period
                        );

                        setHour(
                            converted.hour
                        );

                        setMinute(
                            converted.minute
                        );

                        setReminderMinutes(
                            target.reminderMinutes ??
                            null
                        );

                        setRepeatType(
                            target.repeatType ??
                            "none"
                        );
                    } catch (
                        error
                        ) {
                        console.error(
                            "일정 수정 데이터 로드 오류:",
                            error
                        );

                        if (
                            mounted
                        ) {
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
                        }
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
     * 날짜 옵션
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
                    "제목을 입력해 주세요"
                );

                return;
            }

            const nextSelectedDate =
                createScheduledDate(
                    selectedDate,
                    period,
                    hour,
                    minute
                );

            const originalDate =
                new Date(
                    originalSchedule.scheduledAt
                );

            /*
             * 날짜/시간이 실제로 바뀌었는지 확인합니다.
             */
            const scheduleTimeChanged =
                originalDate.getTime() !==
                nextSelectedDate.getTime();

            /*
             * 기존 정책:
             *
             * 일정 시간을 수정한 경우에만
             * 현재 기준 최소 30분 이후 일정인지 검사합니다.
             *
             * 제목/메모 등만 수정할 때는
             * 기존 일정 시간이 가까워도 수정할 수 있습니다.
             */
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
                    nextSelectedDate.getTime() <
                    minimumDate.getTime()
                ) {
                    Alert.alert(
                        "시간을 확인해 주세요",
                        "일정은 현재 시간 기준 30분 이후로 설정해 주세요."
                    );

                    return;
                }
            }

            setSaving(
                true
            );

            const storageKey =
                getScheduleStorageKey(
                    session
                        ?.user
                        .id
                );

            /*
             * 선택한 일정이 움직인 시간 차이입니다.
             *
             * future 수정에서는
             * 이 차이를 이후 모든 일정에 동일하게 적용합니다.
             */
            const timeDelta =
                nextSelectedDate.getTime() -
                originalDate.getTime();

            let affectedSchedules:
                LocalSchedule[] = [];

            /*
             * =====================================================
             * 수정 대상 선택
             * =====================================================
             */

            if (
                editScope ===
                "future" &&
                originalSchedule.seriesId
            ) {
                const originalTime =
                    originalDate.getTime();

                affectedSchedules =
                    schedules.filter(
                        (
                            schedule
                        ) =>
                            schedule.seriesId ===
                            originalSchedule.seriesId &&
                            new Date(
                                schedule.scheduledAt
                            ).getTime() >=
                            originalTime
                    );
            } else {
                affectedSchedules =
                    schedules.filter(
                        (
                            schedule
                        ) =>
                            schedule.id ===
                            originalSchedule.id
                    );
            }

            if (
                affectedSchedules.length ===
                0
            ) {
                setSaving(
                    false
                );

                Alert.alert(
                    "수정할 일정을 찾지 못했어요"
                );

                return;
            }

            /*
             * 저장 실패 시 rollback 하기 위해
             * 새롭게 생성된 notification ID를 모아둡니다.
             */
            const newlyCreatedNotificationIds:
                string[] = [];

            /*
             * 저장 완료 후 취소할
             * 기존 notification ID입니다.
             */
            const oldNotificationIdsToCancel:
                string[] = [];

            let notificationFailed =
                false;

            try {
                const affectedIds =
                    new Set(
                        affectedSchedules.map(
                            (
                                schedule
                            ) =>
                                schedule.id
                        )
                    );

                const updatedSchedules:
                    LocalSchedule[] = [];

                /*
                 * =====================================================
                 * 수정 대상 일정 생성
                 * =====================================================
                 */

                for (
                    const schedule
                    of affectedSchedules
                    ) {
                    const isSelectedSchedule =
                        schedule.id ===
                        originalSchedule.id;

                    let nextScheduledAt:
                        string;

                    if (
                        editScope ===
                        "future"
                    ) {
                        const previousDate =
                            new Date(
                                schedule.scheduledAt
                            );

                        nextScheduledAt =
                            new Date(
                                previousDate.getTime() +
                                timeDelta
                            ).toISOString();
                    } else {
                        nextScheduledAt =
                            nextSelectedDate.toISOString();
                    }

                    const updated:
                        LocalSchedule = {
                        ...schedule,

                        title:
                        trimmedTitle,

                        memo:
                            memo.trim().length >
                            0
                                ? memo.trim()
                                : null,

                        scheduledAt:
                        nextScheduledAt,

                        repeatType,

                        reminderMinutes,

                        /*
                         * 상태는 기존 일정 각각의 상태를 유지합니다.
                         */
                        status:
                        schedule.status,

                        completed:
                            schedule.status ===
                            "completed",

                        /*
                         * 새 알림 예약 결과를 아래에서 다시 넣습니다.
                         */
                        localNotificationId:
                            null,
                    };

                    /*
                     * 알림 내용에 제목이 들어가기 때문에
                     * 제목 수정도 재예약 대상입니다.
                     */
                    const titleChanged =
                        schedule.title !==
                        trimmedTitle;

                    const reminderChanged =
                        (
                            schedule.reminderMinutes ??
                            null
                        ) !==
                        reminderMinutes;

                    const timeChanged =
                        schedule.scheduledAt !==
                        nextScheduledAt;

                    const notificationNeedsUpdate =
                        titleChanged ||
                        reminderChanged ||
                        timeChanged;

                    if (
                        !notificationNeedsUpdate
                    ) {
                        updated.localNotificationId =
                            schedule.localNotificationId ??
                            null;

                        updatedSchedules.push(
                            updated
                        );

                        continue;
                    }

                    if (
                        schedule.localNotificationId
                    ) {
                        oldNotificationIdsToCancel.push(
                            schedule.localNotificationId
                        );
                    }

                    if (
                        reminderMinutes ==
                        null
                    ) {
                        updated.localNotificationId =
                            null;

                        updatedSchedules.push(
                            updated
                        );

                        continue;
                    }

                    try {
                        const newNotificationId =
                            await createNotification(
                                updated
                            );

                        if (
                            newNotificationId
                        ) {
                            updated.localNotificationId =
                                newNotificationId;

                            newlyCreatedNotificationIds.push(
                                newNotificationId
                            );
                        } else {
                            updated.localNotificationId =
                                null;

                            notificationFailed =
                                true;
                        }
                    } catch (
                        notificationError
                        ) {
                        console.error(
                            "수정 일정 알림 재예약 오류:",
                            notificationError
                        );

                        updated.localNotificationId =
                            null;

                        notificationFailed =
                            true;
                    }

                    updatedSchedules.push(
                        updated
                    );

                    if (
                        isSelectedSchedule
                    ) {
                        console.log(
                            "선택 일정 수정:",
                            updated.id
                        );
                    }
                }

                /*
                 * =====================================================
                 * 전체 일정 배열에 수정 결과 반영
                 * =====================================================
                 */

                const updatedMap =
                    new Map<
                        string,
                        LocalSchedule
                    >();

                updatedSchedules.forEach(
                    (
                        schedule
                    ) => {
                        updatedMap.set(
                            schedule.id,
                            schedule
                        );
                    }
                );

                const nextSchedules =
                    schedules.map(
                        (
                            schedule
                        ) => {
                            if (
                                !affectedIds.has(
                                    schedule.id
                                )
                            ) {
                                return schedule;
                            }

                            return (
                                updatedMap.get(
                                    schedule.id
                                ) ??
                                schedule
                            );
                        }
                    );

                /*
                 * =====================================================
                 * Storage 저장
                 * =====================================================
                 */

                await AsyncStorage.setItem(
                    storageKey,
                    JSON.stringify(
                        nextSchedules
                    )
                );

                /*
                 * =====================================================
                 * 기존 알림 취소
                 *
                 * Storage 저장 성공 후 취소합니다.
                 * =====================================================
                 */

                for (
                    const notificationId
                    of oldNotificationIdsToCancel
                    ) {
                    try {
                        await cancelScheduledNotificationAsync(
                            notificationId
                        );
                    } catch (
                        cancelError
                        ) {
                        console.error(
                            "기존 알림 취소 오류:",
                            cancelError
                        );
                    }
                }

                console.log(
                    "일정 수정 완료:",
                    {
                        scheduleId:
                        originalSchedule.id,

                        editScope,

                        affectedCount:
                        updatedSchedules.length,

                        seriesId:
                            originalSchedule.seriesId ??
                            null,
                    }
                );

                if (
                    notificationFailed
                ) {
                    Alert.alert(
                        "일정은 수정됐어요",
                        "다만 일부 알림은 예약하지 못했어요.",
                        [
                            {
                                text:
                                    "확인",

                                onPress:
                                    () => {
                                        router.replace(
                                            "/"
                                        );
                                    },
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
                 * Storage 저장 전에 새 알림이 생성됐다가
                 * 저장이 실패했으면 새 알림을 rollback 합니다.
                 */
                for (
                    const notificationId
                    of newlyCreatedNotificationIds
                    ) {
                    try {
                        await cancelScheduledNotificationAsync(
                            notificationId
                        );
                    } catch (
                        rollbackError
                        ) {
                        console.error(
                            "신규 알림 rollback 오류:",
                            rollbackError
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

    /*
     * =====================================================
     * Loading
     * =====================================================
     */

    if (
        loading
    ) {
        return (
            <SafeAreaView
                style={
                    styles.safeArea
                }
            >
                <View
                    style={
                        styles.loadingArea
                    }
                >
                    <Text
                        style={
                            styles.loadingText
                        }
                    >
                        일정을 불러오는 중이에요
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    /*
     * =====================================================
     * UI
     * =====================================================
     */

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
                <View
                    style={
                        styles.header
                    }
                >
                    <Pressable
                        onPress={() =>
                            router.back()
                        }
                        hitSlop={10}
                    >
                        <Ionicons
                            name="chevron-back-outline"
                            size={28}
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
                            styles.headerRightSpace
                        }
                    />
                </View>

                {editScope ===
                    "future" && (
                        <View
                            style={
                                styles.scopeBanner
                            }
                        >
                            <Ionicons
                                name="repeat-outline"
                                size={18}
                                color="#D67C83"
                            />

                            <Text
                                style={
                                    styles.scopeBannerText
                                }
                            >
                                이 일정 및 이후 반복 일정이 함께 수정돼요.
                            </Text>
                        </View>
                    )}

                <ScrollView
                    style={
                        styles.scrollView
                    }
                    contentContainerStyle={
                        styles.scrollContent
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                    keyboardShouldPersistTaps="handled"
                >
                    <Section
                        title="제목"
                    >
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
                            placeholderTextColor="#B3B5BA"
                            maxLength={100}
                        />
                    </Section>

                    <Section
                        title="날짜"
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={
                                false
                            }
                            contentContainerStyle={
                                styles.horizontalOptions
                            }
                        >
                            {dateOptions.map(
                                (
                                    option
                                ) => {
                                    const optionDate =
                                        startOfDay(
                                            new Date(
                                                option.value
                                            )
                                        );

                                    const currentDate =
                                        startOfDay(
                                            selectedDate
                                        );

                                    const selected =
                                        optionDate.getTime() ===
                                        currentDate.getTime();

                                    return (
                                        <OptionButton
                                            key={
                                                option.value
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
                                            }}
                                        />
                                    );
                                }
                            )}
                        </ScrollView>
                    </Section>

                    <Section
                        title="시간"
                    >
                        <View
                            style={
                                styles.timePickerRow
                            }
                        >
                            <PickerColumn
                                values={
                                    PERIOD_OPTIONS
                                }
                                selectedValue={
                                    period
                                }
                                formatValue={(
                                    value
                                ) =>
                                    value
                                }
                                onSelect={(
                                    value
                                ) =>
                                    setPeriod(
                                        value
                                    )
                                }
                            />

                            <PickerColumn
                                values={
                                    HOUR_OPTIONS
                                }
                                selectedValue={
                                    hour
                                }
                                formatValue={(
                                    value
                                ) =>
                                    `${value}시`
                                }
                                onSelect={(
                                    value
                                ) =>
                                    setHour(
                                        value
                                    )
                                }
                            />

                            <PickerColumn
                                values={
                                    MINUTE_OPTIONS
                                }
                                selectedValue={
                                    minute
                                }
                                formatValue={(
                                    value
                                ) =>
                                    `${String(
                                        value
                                    ).padStart(
                                        2,
                                        "0"
                                    )}분`
                                }
                                onSelect={(
                                    value
                                ) =>
                                    setMinute(
                                        value
                                    )
                                }
                            />
                        </View>
                    </Section>

                    <Section
                        title="알림"
                    >
                        <View
                            style={
                                styles.optionWrap
                            }
                        >
                            {REMINDER_OPTIONS.map(
                                (
                                    option
                                ) => (
                                    <OptionButton
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
                                            setReminderMinutes(
                                                option.value
                                            )
                                        }
                                    />
                                )
                            )}
                        </View>
                    </Section>

                    <Section
                        title="반복"
                    >
                        <View
                            style={
                                styles.optionWrap
                            }
                        >
                            {REPEAT_OPTIONS.map(
                                (
                                    option
                                ) => (
                                    <OptionButton
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
                                            setRepeatType(
                                                option.value
                                            )
                                        }
                                    />
                                )
                            )}
                        </View>

                        {repeatType ===
                            "weekday" && (
                                <View
                                    style={
                                        styles.weekdayInfo
                                    }
                                >
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={17}
                                        color="#D67C83"
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
                    </Section>

                    <Section
                        title="메모"
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
                            placeholderTextColor="#B3B5BA"
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                        />

                        <Text
                            style={
                                styles.memoCount
                            }
                        >
                            {memo.length}
                            /500
                        </Text>
                    </Section>
                </ScrollView>

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
                        onPress={() => {
                            void handleSave();
                        }}
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
            </View>
        </SafeAreaView>
    );
}

/*
 * =====================================================
 * Section
 * =====================================================
 */

function Section({
                     title,
                     children,
                 }: {
    title:
        string;

    children:
        ReactNode;
}) {
    return (
        <View
            style={
                styles.section
            }
        >
            <Text
                style={
                    styles.sectionTitle
                }
            >
                {
                    title
                }
            </Text>

            {
                children
            }
        </View>
    );
}

/*
 * =====================================================
 * Option Button
 * =====================================================
 */

function OptionButton({
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
            style={[
                styles.optionButton,

                selected &&
                styles.optionButtonSelected,
            ]}
            onPress={
                onPress
            }
        >
            <Text
                style={[
                    styles.optionButtonText,

                    selected &&
                    styles.optionButtonTextSelected,
                ]}
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
 * Picker Column
 * =====================================================
 */

function PickerColumn<T extends string | number>({
                                                     values,
                                                     selectedValue,
                                                     formatValue,
                                                     onSelect,
                                                 }: {
    values:
        readonly T[];

    selectedValue:
        T;

    formatValue:
        (
            value:
            T
        ) => string;

    onSelect:
        (
            value:
            T
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
            nestedScrollEnabled
        >
            {values.map(
                (
                    value
                ) => {
                    const selected =
                        value ===
                        selectedValue;

                    return (
                        <Pressable
                            key={
                                String(
                                    value
                                )
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
                                    formatValue(
                                        value
                                    )
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

        headerTitle: {
            fontSize: 18,
            fontWeight: "700",
            color: "#111111",
        },

        headerRightSpace: {
            width: 28,
        },

        scopeBanner: {
            marginHorizontal: 20,
            marginTop: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor:
                "#FFF4F4",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        scopeBannerText: {
            flex: 1,
            fontSize: 13,
            lineHeight: 19,
            color: "#8A5559",
        },

        scrollView: {
            flex: 1,
        },

        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 36,
        },

        section: {
            marginBottom: 32,
        },

        sectionTitle: {
            marginBottom: 12,
            fontSize: 16,
            fontWeight: "700",
            color: "#111111",
        },

        titleInput: {
            height: 54,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor:
                "#E2E3E6",
            borderRadius: 10,
            fontSize: 16,
            color: "#111111",
            backgroundColor:
                "#FFFFFF",
        },

        horizontalOptions: {
            gap: 10,
            paddingRight: 20,
        },

        optionWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },

        optionButton: {
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 22,
            borderWidth: 1,
            borderColor:
                "#E0E1E5",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
                "#FFFFFF",
        },

        optionButtonSelected: {
            borderColor:
                "#111111",
            backgroundColor:
                "#111111",
        },

        optionButtonText: {
            fontSize: 14,
            color: "#555860",
        },

        optionButtonTextSelected: {
            fontWeight: "600",
            color: "#FFFFFF",
        },

        timePickerRow: {
            height: 210,
            flexDirection: "row",
            gap: 10,
        },

        pickerColumn: {
            flex: 1,
            borderWidth: 1,
            borderColor:
                "#E2E3E6",
            borderRadius: 12,
            backgroundColor:
                "#FAFAFB",
        },

        pickerColumnContent: {
            paddingVertical: 8,
        },

        pickerItem: {
            height: 44,
            marginHorizontal: 6,
            marginVertical: 2,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
        },

        pickerItemSelected: {
            backgroundColor:
                "#111111",
        },

        pickerItemText: {
            fontSize: 15,
            color: "#666A72",
        },

        pickerItemTextSelected: {
            fontWeight: "700",
            color: "#FFFFFF",
        },

        weekdayInfo: {
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },

        weekdayInfoText: {
            fontSize: 13,
            color: "#D67C83",
        },

        memoInput: {
            minHeight: 130,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor:
                "#E2E3E6",
            borderRadius: 10,
            fontSize: 15,
            lineHeight: 22,
            color: "#111111",
            backgroundColor:
                "#FFFFFF",
        },

        memoCount: {
            marginTop: 8,
            textAlign: "right",
            fontSize: 12,
            color: "#999CA3",
        },

        bottomArea: {
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor:
                "#EEEEF0",
            backgroundColor:
                "#FFFFFF",
        },

        saveButton: {
            height: 56,
            borderRadius: 8,
            backgroundColor:
                "#111111",
            alignItems: "center",
            justifyContent: "center",
        },

        saveButtonDisabled: {
            opacity: 0.45,
        },

        saveButtonText: {
            fontSize: 17,
            fontWeight: "700",
            color: "#FFFFFF",
        },

        loadingArea: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },

        loadingText: {
            fontSize: 15,
            color: "#777B84",
        },
    });