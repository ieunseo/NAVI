import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    useMemo,
    useRef,
} from "react";

import { Ionicons } from "@expo/vector-icons";

type ScheduleStatus =
    | "pending"
    | "completed"
    | "failed";

type ScheduleCardProps = {
    title: string;
    time: string;
    status: ScheduleStatus;

    onPress: () => void;

    /*
     * 왼쪽 Swipe
     *
     * pending   → completed
     * completed → pending
     * failed    → pending
     */
    onToggle: () => void;

    /*
     * 오른쪽 Swipe
     *
     * pending   → failed
     * completed → failed
     * failed    → 변화 없음
     */
    onFail: () => void;
};

const ACTION_WIDTH = 92;
const OPEN_THRESHOLD = 42;

export function ScheduleCard({
                                 title,
                                 time,
                                 status,
                                 onPress,
                                 onToggle,
                                 onFail,
                             }: ScheduleCardProps) {
    const translateX =
        useRef(
            new Animated.Value(0)
        ).current;

    /*
     * 현재 열려 있는 Action
     *
     * fail
     * → 카드를 오른쪽으로 밀어서
     *   왼쪽의 실패 Action이 열린 상태
     *
     * toggle
     * → 카드를 왼쪽으로 밀어서
     *   오른쪽의 완료/대기 Action이 열린 상태
     */
    const openedSide =
        useRef<
            "fail" | "toggle" | null
        >(null);

    const gestureStartX =
        useRef(0);

    const isCompleted =
        status === "completed";

    const isFailed =
        status === "failed";

    const animateTo = (
        value: number
    ) => {
        Animated.spring(
            translateX,
            {
                toValue: value,
                useNativeDriver: true,
                friction: 8,
                tension: 80,
            }
        ).start();
    };

    const closeSwipe = () => {
        openedSide.current = null;

        animateTo(0);
    };

    const openFail = () => {
        openedSide.current = "fail";

        animateTo(
            ACTION_WIDTH
        );
    };

    const openToggle = () => {
        openedSide.current = "toggle";

        animateTo(
            -ACTION_WIDTH
        );
    };

    const panResponder =
        useMemo(
            () =>
                PanResponder.create({
                    onMoveShouldSetPanResponder:
                        (
                            _,
                            gestureState
                        ) => {
                            const {
                                dx,
                                dy,
                            } =
                                gestureState;

                            return (
                                Math.abs(dx) >
                                8 &&
                                Math.abs(dx) >
                                Math.abs(dy)
                            );
                        },

                    onPanResponderGrant:
                        () => {
                            if (
                                openedSide.current ===
                                "fail"
                            ) {
                                gestureStartX.current =
                                    ACTION_WIDTH;

                                return;
                            }

                            if (
                                openedSide.current ===
                                "toggle"
                            ) {
                                gestureStartX.current =
                                    -ACTION_WIDTH;

                                return;
                            }

                            gestureStartX.current =
                                0;
                        },

                    onPanResponderMove:
                        (
                            _,
                            gestureState
                        ) => {
                            const nextValue =
                                gestureStartX.current +
                                gestureState.dx;

                            const clampedValue =
                                Math.max(
                                    -ACTION_WIDTH,
                                    Math.min(
                                        ACTION_WIDTH,
                                        nextValue
                                    )
                                );

                            translateX.setValue(
                                clampedValue
                            );
                        },

                    onPanResponderRelease:
                        (
                            _,
                            gestureState
                        ) => {
                            const finalValue =
                                gestureStartX.current +
                                gestureState.dx;

                            /*
                             * 오른쪽 Swipe
                             * → 왼쪽 실패 Action
                             */
                            if (
                                finalValue >
                                OPEN_THRESHOLD
                            ) {
                                openFail();

                                return;
                            }

                            /*
                             * 왼쪽 Swipe
                             * → 오른쪽 완료/대기 Action
                             */
                            if (
                                finalValue <
                                -OPEN_THRESHOLD
                            ) {
                                openToggle();

                                return;
                            }

                            closeSwipe();
                        },

                    onPanResponderTerminate:
                        () => {
                            closeSwipe();
                        },
                }),
            [translateX]
        );

    /*
     * 왼쪽 Swipe Action
     *
     * pending → 완료
     * completed → 대기
     * failed → 대기
     */
    const handleToggle = () => {
        closeSwipe();

        onToggle();
    };

    /*
     * 오른쪽 Swipe Action
     *
     * 이미 실패 상태라면
     * 상태 변경을 다시 실행하지 않습니다.
     */
    const handleFail = () => {
        closeSwipe();

        if (
            isFailed
        ) {
            return;
        }

        onFail();
    };

    const handlePress = () => {
        /*
         * Action이 열린 상태에서 카드를 누르면
         * 상세 Popup을 바로 열지 않고
         * 우선 Swipe를 닫습니다.
         */
        if (
            openedSide.current
        ) {
            closeSwipe();

            return;
        }

        onPress();
    };

    const toggleLabel =
        isCompleted
            ? "대기"
            : isFailed
                ? "대기"
                : "완료";

    const toggleIcon:
        keyof typeof Ionicons.glyphMap =
        isCompleted || isFailed
            ? "arrow-undo-outline"
            : "checkmark-outline";

    const statusLabel =
        status === "completed"
            ? "완료"
            : status === "failed"
                ? "실패"
                : "대기";

    return (
        <View style={styles.wrapper}>
            {/*
             * =====================================================
             * 왼쪽 Action
             *
             * 카드를 오른쪽으로 Swipe하면 표시됩니다.
             * =====================================================
             */}
            <View
                style={
                    styles.leftActionContainer
                }
            >
                <Pressable
                    style={[
                        styles.failAction,

                        isFailed &&
                        styles.failActionDisabled,
                    ]}
                    onPress={
                        handleFail
                    }
                    disabled={
                        isFailed
                    }
                >
                    <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color="#FFFFFF"
                    />

                    <Text
                        style={
                            styles.failActionText
                        }
                    >
                        실패
                    </Text>
                </Pressable>
            </View>

            {/*
             * =====================================================
             * 오른쪽 Action
             *
             * 카드를 왼쪽으로 Swipe하면 표시됩니다.
             * =====================================================
             */}
            <View
                style={
                    styles.rightActionContainer
                }
            >
                <Pressable
                    style={
                        styles.toggleAction
                    }
                    onPress={
                        handleToggle
                    }
                >
                    <Ionicons
                        name={
                            toggleIcon
                        }
                        size={22}
                        color="#FFFFFF"
                    />

                    <Text
                        style={
                            styles.toggleActionText
                        }
                    >
                        {
                            toggleLabel
                        }
                    </Text>
                </Pressable>
            </View>

            {/*
             * =====================================================
             * 실제 일정 Card
             * =====================================================
             */}
            <Animated.View
                style={[
                    styles.card,

                    {
                        transform: [
                            {
                                translateX,
                            },
                        ],
                    },

                    isFailed &&
                    styles.cardFailed,
                ]}
                {...panResponder.panHandlers}
            >
                <Pressable
                    style={
                        styles.cardPressable
                    }
                    onPress={
                        handlePress
                    }
                >
                    <View
                        style={
                            styles.contentArea
                        }
                    >
                        <Text
                            style={[
                                styles.title,

                                isCompleted &&
                                styles.titleCompleted,

                                isFailed &&
                                styles.titleFailed,
                            ]}
                            numberOfLines={1}
                        >
                            {
                                title
                            }
                        </Text>

                        <Text
                            style={
                                styles.time
                            }
                        >
                            {
                                time
                            }
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,

                            status ===
                            "pending" &&
                            styles.statusBadgePending,

                            status ===
                            "completed" &&
                            styles.statusBadgeCompleted,

                            status ===
                            "failed" &&
                            styles.statusBadgeFailed,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,

                                status ===
                                "failed" &&
                                styles.statusTextFailed,
                            ]}
                        >
                            {
                                statusLabel
                            }
                        </Text>
                    </View>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles =
    StyleSheet.create({
        wrapper: {
            minHeight: 82,
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#F3F3F4",
        },

        /*
         * =====================================================
         * 실패 Action
         * =====================================================
         */
        leftActionContainer: {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: ACTION_WIDTH,
            alignItems: "stretch",
            justifyContent: "center",
        },

        failAction: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            backgroundColor: "#E85C5C",
        },

        failActionDisabled: {
            backgroundColor: "#B9BBC1",
        },

        failActionText: {
            fontSize: 12,
            fontWeight: "600",
            color: "#FFFFFF",
        },

        /*
         * =====================================================
         * 완료 / 대기 Action
         * =====================================================
         */
        rightActionContainer: {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: ACTION_WIDTH,
            alignItems: "stretch",
            justifyContent: "center",
        },

        toggleAction: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            backgroundColor: "#111111",
        },

        toggleActionText: {
            fontSize: 12,
            fontWeight: "600",
            color: "#FFFFFF",
        },

        /*
         * =====================================================
         * Card
         * =====================================================
         */
        card: {
            minHeight: 82,
            borderWidth: 1,
            borderColor: "#ECEDEF",
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
        },

        cardFailed: {
            borderColor: "#F1C7C7",
        },

        cardPressable: {
            flex: 1,
            minHeight: 82,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },

        contentArea: {
            flex: 1,
        },

        title: {
            fontSize: 16,
            lineHeight: 23,
            fontWeight: "600",
            color: "#111111",
        },

        titleCompleted: {
            color: "#999CA3",
            textDecorationLine: "line-through",
        },

        titleFailed: {
            color: "#A15A5A",
        },

        time: {
            marginTop: 6,
            fontSize: 13,
            color: "#8A8E96",
        },

        /*
         * =====================================================
         * 상태 Badge
         * =====================================================
         */
        statusBadge: {
            minWidth: 50,
            height: 30,
            paddingHorizontal: 10,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
        },

        statusBadgePending: {
            backgroundColor: "#FFF1F1",
        },

        statusBadgeCompleted: {
            backgroundColor: "#F1F1F2",
        },

        statusBadgeFailed: {
            backgroundColor: "#FDEAEA",
        },

        statusText: {
            fontSize: 12,
            fontWeight: "600",
            color: "#55585F",
        },

        statusTextFailed: {
            color: "#C84F4F",
        },
    });