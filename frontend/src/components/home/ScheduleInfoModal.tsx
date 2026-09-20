import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

type RepeatType =
    | "none"
    | "daily"
    | "weekday"
    | "weekly";

type ScheduleStatus =
    | "pending"
    | "completed"
    | "failed";

type ScheduleInfo = {
    id: string;

    /*
     * 반복 일정 그룹 ID
     *
     * 반복 일정 해제 여부 판단에 사용합니다.
     */
    seriesId?: string | null;

    title: string;

    memo?: string | null;

    scheduledAt: string;

    status: ScheduleStatus;

    /*
     * 기존 LocalSchedule 구조와의
     * 호환을 위해 유지합니다.
     *
     * 실제 상태 판단은 status를 기준으로 합니다.
     */
    completed: boolean;

    reminderMinutes?:
        number | null;

    repeatType?:
        RepeatType;

    localNotificationId?:
        string | null;
};

type ScheduleInfoModalProps = {
    visible: boolean;

    schedule:
        ScheduleInfo | null;

    onClose:
        () => void;

    onEdit:
        (
            schedule: ScheduleInfo
        ) => void;

    /*
     * 반복 일정 해제
     *
     * 일정 자체는 유지하고
     * 반복 설정만 제거합니다.
     */
    onRemoveRepeat:
        (
            schedule: ScheduleInfo
        ) => void;

    onDelete:
        (
            schedule: ScheduleInfo
        ) => void;
};

/*
 * =====================================================
 * 날짜 표시
 * =====================================================
 */
function formatScheduleDate(
    scheduledAt: string
) {
    const date =
        new Date(
            scheduledAt
        );

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

    const weekdays = [
        "일",
        "월",
        "화",
        "수",
        "목",
        "금",
        "토",
    ];

    const weekday =
        weekdays[
            date.getDay()
            ];

    return `${year}. ${month}. ${day} (${weekday})`;
}

/*
 * =====================================================
 * 시간 표시
 * =====================================================
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
 * =====================================================
 * 알림 표시
 * =====================================================
 */
function formatReminder(
    reminderMinutes?:
        number | null
) {
    if (
        reminderMinutes ===
        undefined ||
        reminderMinutes ===
        null
    ) {
        return "알림 없음";
    }

    if (
        reminderMinutes ===
        60
    ) {
        return "1시간 전";
    }

    if (
        reminderMinutes ===
        120
    ) {
        return "2시간 전";
    }

    return `${reminderMinutes}분 전`;
}

/*
 * =====================================================
 * 반복 표시
 * =====================================================
 */
function formatRepeatType(
    repeatType?:
    RepeatType
) {
    switch (
        repeatType
        ) {
        case "daily":
            return "매일";

        case "weekday":
            return "평일";

        case "weekly":
            return "매주";

        case "none":
        default:
            return "반복 없음";
    }
}

/*
 * =====================================================
 * 상태 표시
 * =====================================================
 */
function formatStatus(
    status:
    ScheduleStatus
) {
    switch (
        status
        ) {
        case "completed":
            return "완료";

        case "failed":
            return "실패";

        case "pending":
        default:
            return "대기";
    }
}

/*
 * =====================================================
 * Modal
 * =====================================================
 */
export function ScheduleInfoModal({
                                      visible,
                                      schedule,
                                      onClose,
                                      onEdit,
                                      onRemoveRepeat,
                                      onDelete,
                                  }: ScheduleInfoModalProps) {
    if (
        !schedule
    ) {
        return null;
    }

    /*
     * repeatType과 seriesId가 모두 존재해야
     * 실제 반복 일정으로 판단합니다.
     */
    const isRepeatSchedule =
        schedule.repeatType !==
        undefined &&
        schedule.repeatType !==
        "none" &&
        Boolean(
            schedule.seriesId
        );

    /*
     * =====================================================
     * 반복 해제
     * =====================================================
     */

    const handleRemoveRepeatPress =
        () => {
            if (
                !isRepeatSchedule
            ) {
                return;
            }

            Alert.alert(
                "반복을 해제할까요?",
                "현재 일정은 그대로 유지하고 이후 반복 일정은 삭제돼요.",
                [
                    {
                        text:
                            "취소",

                        style:
                            "cancel",
                    },

                    {
                        text:
                            "반복 해제",

                        style:
                            "destructive",

                        onPress:
                            () => {
                                onRemoveRepeat(
                                    schedule
                                );
                            },
                    },
                ]
            );
        };

    /*
     * =====================================================
     * 일정 삭제
     * =====================================================
     */

    const handleDeletePress =
        () => {
            Alert.alert(
                "일정을 삭제할까요?",
                schedule.localNotificationId
                    ? "삭제한 일정은 복구할 수 없어요.\n예약된 알림도 함께 삭제돼요."
                    : "삭제한 일정은 복구할 수 없어요.",
                [
                    {
                        text:
                            "취소",

                        style:
                            "cancel",
                    },

                    {
                        text:
                            "삭제",

                        style:
                            "destructive",

                        onPress:
                            () => {
                                onDelete(
                                    schedule
                                );
                            },
                    },
                ]
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
                    styles.overlay
                }
            >
                {/*
                 * Popup 바깥 영역을 누르면 닫습니다.
                 */}
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
                        styles.modal
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
                        <Text
                            style={
                                styles.headerTitle
                            }
                        >
                            일정 정보
                        </Text>

                        <View
                            style={
                                styles.headerActions
                            }
                        >
                            {/*
                             * 일정 수정
                             */}
                            <Pressable
                                style={
                                    styles.iconButton
                                }
                                onPress={() =>
                                    onEdit(
                                        schedule
                                    )
                                }
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="pencil-outline"
                                    size={21}
                                    color="#111111"
                                />
                            </Pressable>

                            <Pressable
                                style={
                                    styles.iconButton
                                }
                                onPress={
                                    onClose
                                }
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="close"
                                    size={24}
                                    color="#111111"
                                />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView
                        style={
                            styles.contentScroll
                        }
                        contentContainerStyle={
                            styles.content
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                    >
                        {/*
                         * =====================================================
                         * 제목 / 상태
                         * =====================================================
                         */}
                        <View
                            style={
                                styles.titleArea
                            }
                        >
                            <Text
                                style={
                                    styles.scheduleTitle
                                }
                            >
                                {
                                    schedule.title
                                }
                            </Text>

                            <View
                                style={[
                                    styles.statusBadge,

                                    schedule.status ===
                                    "pending" &&
                                    styles.statusBadgePending,

                                    schedule.status ===
                                    "completed" &&
                                    styles.statusBadgeCompleted,

                                    schedule.status ===
                                    "failed" &&
                                    styles.statusBadgeFailed,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusBadgeText,

                                        schedule.status ===
                                        "failed" &&
                                        styles.statusBadgeTextFailed,
                                    ]}
                                >
                                    {formatStatus(
                                        schedule.status
                                    )}
                                </Text>
                            </View>
                        </View>

                        {/*
                         * =====================================================
                         * 일정 정보
                         * =====================================================
                         */}
                        <View
                            style={
                                styles.infoBox
                            }
                        >
                            <InfoRow
                                icon="calendar-outline"
                                label="날짜"
                                value={formatScheduleDate(
                                    schedule.scheduledAt
                                )}
                            />

                            <InfoRow
                                icon="time-outline"
                                label="시간"
                                value={formatScheduleTime(
                                    schedule.scheduledAt
                                )}
                            />

                            <InfoRow
                                icon="notifications-outline"
                                label="알림"
                                value={formatReminder(
                                    schedule.reminderMinutes
                                )}
                            />

                            <InfoRow
                                icon="repeat-outline"
                                label="반복"
                                value={formatRepeatType(
                                    schedule.repeatType
                                )}
                                isLast
                            />
                        </View>

                        {/*
                         * =====================================================
                         * 메모
                         * =====================================================
                         */}
                        {schedule.memo &&
                        schedule.memo
                            .trim()
                            .length >
                        0 ? (
                            <View
                                style={
                                    styles.memoArea
                                }
                            >
                                <Text
                                    style={
                                        styles.memoLabel
                                    }
                                >
                                    메모
                                </Text>

                                <Text
                                    style={
                                        styles.memoText
                                    }
                                >
                                    {
                                        schedule.memo
                                    }
                                </Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/*
                     * =====================================================
                     * 하단 버튼
                     * =====================================================
                     */}
                    <View
                        style={
                            styles.bottomArea
                        }
                    >
                        <Pressable
                            style={
                                styles.confirmButton
                            }
                            onPress={
                                onClose
                            }
                        >
                            <Text
                                style={
                                    styles.confirmButtonText
                                }
                            >
                                확인
                            </Text>
                        </Pressable>

                        {/*
                         * 반복 일정에서만 노출합니다.
                         *
                         * 일반 일정에는
                         * 반복 해제 버튼이 나타나지 않습니다.
                         */}
                        {isRepeatSchedule && (
                            <Pressable
                                style={
                                    styles.removeRepeatButton
                                }
                                onPress={
                                    handleRemoveRepeatPress
                                }
                            >
                                <Ionicons
                                    name="repeat-outline"
                                    size={18}
                                    color="#777B84"
                                />

                                <Text
                                    style={
                                        styles.removeRepeatButtonText
                                    }
                                >
                                    반복 해제
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={
                                styles.deleteButton
                            }
                            onPress={
                                handleDeletePress
                            }
                        >
                            <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#D95656"
                            />

                            <Text
                                style={
                                    styles.deleteButtonText
                                }
                            >
                                삭제하기
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/*
 * =====================================================
 * 정보 Row
 * =====================================================
 */
function InfoRow({
                     icon,
                     label,
                     value,
                     isLast = false,
                 }: {
    icon:
        keyof typeof Ionicons.glyphMap;

    label:
        string;

    value:
        string;

    isLast?:
        boolean;
}) {
    return (
        <View
            style={[
                styles.infoRow,

                isLast &&
                styles.infoRowLast,
            ]}
        >
            <View
                style={
                    styles.infoLabelArea
                }
            >
                <Ionicons
                    name={
                        icon
                    }
                    size={19}
                    color="#777B84"
                />

                <Text
                    style={
                        styles.infoLabel
                    }
                >
                    {
                        label
                    }
                </Text>
            </View>

            <Text
                style={
                    styles.infoValue
                }
            >
                {
                    value
                }
            </Text>
        </View>
    );
}

const styles =
    StyleSheet.create({
        overlay: {
            flex: 1,
            paddingHorizontal: 24,
            backgroundColor:
                "rgba(0, 0, 0, 0.35)",
            alignItems: "center",
            justifyContent: "center",
        },

        modal: {
            width: "100%",
            maxWidth: 342,
            maxHeight: "82%",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 18,
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
        },

        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
        },

        headerTitle: {
            fontSize: 18,
            fontWeight: "700",
            color: "#111111",
        },

        headerActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        iconButton: {
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
        },

        contentScroll: {
            marginTop: 12,
        },

        content: {
            paddingBottom: 4,
        },

        titleArea: {
            marginTop: 8,
            marginBottom: 22,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            gap: 12,
        },

        scheduleTitle: {
            flex: 1,
            fontSize: 23,
            lineHeight: 31,
            fontWeight: "700",
            color: "#111111",
        },

        statusBadge: {
            minWidth: 48,
            height: 30,
            paddingHorizontal: 10,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
        },

        statusBadgePending: {
            backgroundColor:
                "#FFF1F1",
        },

        statusBadgeCompleted: {
            backgroundColor:
                "#F0F0F1",
        },

        statusBadgeFailed: {
            backgroundColor:
                "#FDEAEA",
        },

        statusBadgeText: {
            fontSize: 12,
            fontWeight: "600",
            color: "#55585F",
        },

        statusBadgeTextFailed: {
            color: "#C84F4F",
        },

        infoBox: {
            borderWidth: 1,
            borderColor: "#ECEDEF",
            borderRadius: 12,
            paddingHorizontal: 16,
            backgroundColor: "#FFFFFF",
        },

        infoRow: {
            minHeight: 58,
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            borderBottomWidth: 1,
            borderBottomColor:
                "#F0F0F1",
            gap: 16,
        },

        infoRowLast: {
            borderBottomWidth: 0,
        },

        infoLabelArea: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        infoLabel: {
            fontSize: 14,
            color: "#777B84",
        },

        infoValue: {
            flexShrink: 1,
            fontSize: 14,
            fontWeight: "500",
            color: "#111111",
            textAlign: "right",
        },

        memoArea: {
            marginTop: 18,
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor:
                "#F7F7F8",
        },

        memoLabel: {
            marginBottom: 8,
            fontSize: 13,
            fontWeight: "600",
            color: "#777B84",
        },

        memoText: {
            fontSize: 15,
            lineHeight: 22,
            color: "#333333",
        },

        bottomArea: {
            marginTop: 20,
            gap: 8,
        },

        confirmButton: {
            height: 52,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111111",
        },

        confirmButtonText: {
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
        },

        /*
         * 반복 일정에서만 노출되는 버튼입니다.
         *
         * 삭제와 의미가 다르기 때문에
         * 빨간색 destructive 스타일을 사용하지 않습니다.
         */
        removeRepeatButton: {
            height: 48,
            borderRadius: 6,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor:
                "#F7F7F8",
        },

        removeRepeatButtonText: {
            fontSize: 15,
            fontWeight: "600",
            color: "#55585F",
        },

        deleteButton: {
            height: 48,
            borderRadius: 6,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: "#FFFFFF",
        },

        deleteButtonText: {
            fontSize: 15,
            fontWeight: "600",
            color: "#D95656",
        },
    });