export const STORAGE_KEYS = {
    permissionOnboardingCompleted:
        "permission_onboarding_completed",

    /*
     * 기기 로컬 일정 저장용 prefix
     *
     * 실제 저장 시:
     *
     * 비회원
     * → navi_local_schedules:guest
     *
     * 회원
     * → navi_local_schedules:{userId}
     */
    localSchedulesPrefix:
        "navi_local_schedules",
} as const;