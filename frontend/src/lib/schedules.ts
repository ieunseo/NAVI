import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "../constants/storageKeys";

/*
 * =====================================================
 * 일정 저장소
 *
 * 화면은 이 파일의 함수만 사용합니다.
 * 백엔드 일정 API가 생기면 이 파일의 구현만
 * AsyncStorage → API 호출로 바꾸면 됩니다.
 * =====================================================
 */

/*
 * none    → 반복 없음
 * daily   → 매일 반복
 * weekday → 평일 반복 (월 ~ 금)
 * weekly  → 매주 동일 요일 반복
 */
export type RepeatType =
    | "none"
    | "daily"
    | "weekday"
    | "weekly";

export type ScheduleStatus =
    | "pending"
    | "completed"
    | "failed";

export type LocalSchedule = {
    id: string;

    /*
     * 같은 반복 일정 그룹을 식별하는 ID입니다.
     *
     * 반복 없음 → null
     * 반복 일정 → 같은 반복 묶음끼리 동일한 seriesId 사용
     */
    seriesId?: string | null;

    title: string;

    memo?: string | null;

    scheduledAt: string;

    repeatType?: RepeatType;

    status: ScheduleStatus;

    /*
     * 기존 데이터 호환용입니다.
     * 실제 상태 판단은 status를 기준으로 합니다.
     */
    completed: boolean;

    reminderMinutes?: number | null;

    /*
     * Expo Local Notification 예약 ID
     *
     * 일정 수정 / 삭제 / 완료 시
     * 예약된 알림을 취소할 때 사용합니다.
     */
    localNotificationId?: string | null;
};

/*
 * 비회원 → navi_local_schedules:guest
 * 회원   → navi_local_schedules:{userId}
 */
export function getScheduleStorageKey(
    userId?: string
) {
    return `${STORAGE_KEYS.localSchedulesPrefix}:${
        userId ?? "guest"
    }`;
}

/*
 * 기존에 저장된 일정에는 일부 값이 없을 수 있어
 * 누락된 값을 기본값으로 보정합니다.
 */
export function normalizeSchedule(
    schedule: LocalSchedule
): LocalSchedule {
    const status: ScheduleStatus =
        schedule.status ??
        (schedule.completed
            ? "completed"
            : "pending");

    return {
        ...schedule,
        seriesId: schedule.seriesId ?? null,
        repeatType: schedule.repeatType ?? "none",
        status,
        completed: status === "completed",
        reminderMinutes:
            schedule.reminderMinutes ?? null,
        localNotificationId:
            schedule.localNotificationId ?? null,
    };
}

/*
 * 저장된 일정 전체를 불러옵니다.
 *
 * 저장된 값이 없거나 배열이 아니면 빈 배열을 돌려줍니다.
 * JSON 파싱 오류는 호출한 쪽에서 처리하도록 그대로 던집니다.
 */
export async function loadSchedules(
    userId?: string
): Promise<LocalSchedule[]> {
    const stored =
        await AsyncStorage.getItem(
            getScheduleStorageKey(userId)
        );

    if (!stored) {
        return [];
    }

    const parsed: unknown =
        JSON.parse(stored);

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed.map((schedule) =>
        normalizeSchedule(
            schedule as LocalSchedule
        )
    );
}

/*
 * 일정 전체를 덮어써서 저장합니다.
 */
export async function saveSchedules(
    userId: string | undefined,
    schedules: LocalSchedule[]
) {
    await AsyncStorage.setItem(
        getScheduleStorageKey(userId),
        JSON.stringify(schedules)
    );
}
