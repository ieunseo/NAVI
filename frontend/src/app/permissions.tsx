import { useState } from "react";
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { isRunningInExpoGo } from "expo";

import {
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
} from "expo-audio";

import {
    getPermissionsAsync,
    requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import {
    IosAuthorizationStatus,
    type NotificationPermissionsStatus,
} from "expo-notifications/build/NotificationPermissions.types";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "../constants/storageKeys";

const LOCAL_NOTIFICATION_CHANNEL_ID = "schedule-reminders";
const IS_EXPO_GO = isRunningInExpoGo();
const SETTINGS_APP_NAME = IS_EXPO_GO ? "Expo Go" : "NAVI";

setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

function isNotificationAllowed(
    permission: NotificationPermissionsStatus
) {
    return (
        permission.granted ||
        permission.ios?.status ===
        IosAuthorizationStatus.PROVISIONAL
    );
}

function showSettingsAlert(title: string, message: string) {
    Alert.alert(title, message, [
        {
            text: "취소",
            style: "cancel",
        },
        {
            text: "설정 열기",
            onPress: () => {
                void Linking.openSettings().catch(() => {
                    Alert.alert(
                        "설정을 열 수 없어요",
                        `기기 설정에서 ${SETTINGS_APP_NAME}의 권한을 변경해주세요.`
                    );
                });
            },
        },
    ]);
}

export default function PermissionsScreen() {
    const [microphoneBusy, setMicrophoneBusy] = useState(false);
    const [notificationBusy, setNotificationBusy] = useState(false);
    const [startBusy, setStartBusy] = useState(false);

    const handleMicrophonePress = async () => {
        if (microphoneBusy || startBusy) return;

        setMicrophoneBusy(true);

        try {
            const currentPermission =
                await getRecordingPermissionsAsync();

            if (currentPermission.granted) {
                Alert.alert(
                    "마이크 권한",
                    "이미 마이크 권한이 허용되어 있어요."
                );
                return;
            }

            if (!currentPermission.canAskAgain) {
                showSettingsAlert(
                    "마이크 권한이 필요해요",
                    `기기 설정에서 ${SETTINGS_APP_NAME}의 마이크 권한을 허용해주세요.`
                );
                return;
            }

            const permission =
                await requestRecordingPermissionsAsync();

            if (permission.granted) {
                Alert.alert(
                    "마이크 권한",
                    "마이크 권한이 허용되었어요."
                );
                return;
            }

            if (!permission.canAskAgain) {
                showSettingsAlert(
                    "마이크 권한이 필요해요",
                    `기기 설정에서 ${SETTINGS_APP_NAME}의 마이크 권한을 허용해주세요.`
                );
                return;
            }

            Alert.alert(
                "마이크 권한",
                "마이크 권한을 허용하지 않았어요. 직접 입력은 계속 사용할 수 있어요."
            );
        } catch (error) {
            console.error("마이크 권한 요청 오류:", error);

            Alert.alert(
                "오류",
                "마이크 권한을 확인하는 중 문제가 발생했어요."
            );
        } finally {
            setMicrophoneBusy(false);
        }
    };

    const handleNotificationPress = async () => {
        if (notificationBusy || startBusy) return;

        if (Platform.OS === "web") {
            Alert.alert(
                "알림 안내",
                "일정 알림은 Android 또는 iOS 앱에서 사용할 수 있어요."
            );
            return;
        }

        setNotificationBusy(true);

        try {
            if (
                Platform.OS === "android" &&
                !IS_EXPO_GO
            ) {
                await setNotificationChannelAsync(
                    LOCAL_NOTIFICATION_CHANNEL_ID,
                    {
                        name: "일정 알림",
                        importance: AndroidImportance.DEFAULT,
                        sound: "default",
                    }
                );
            }

            const currentPermission =
                await getPermissionsAsync();

            if (isNotificationAllowed(currentPermission)) {
                Alert.alert(
                    "알림 권한",
                    "이미 알림이 허용되어 있어요. 기기에 예약한 일정 알림을 받을 수 있어요."
                );
                return;
            }

            if (!currentPermission.canAskAgain) {
                showSettingsAlert(
                    "알림 권한이 필요해요",
                    `기기 설정에서 ${SETTINGS_APP_NAME}의 알림 권한을 허용해주세요.`
                );
                return;
            }

            const permission =
                await requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: false,
                        allowSound: true,
                    },
                });

            if (isNotificationAllowed(permission)) {
                Alert.alert(
                    "알림 권한",
                    "알림이 허용되었어요. 기기에 예약한 일정 알림을 받을 수 있어요."
                );
                return;
            }

            if (!permission.canAskAgain) {
                showSettingsAlert(
                    "알림 권한이 필요해요",
                    `기기 설정에서 ${SETTINGS_APP_NAME}의 알림 권한을 허용해주세요.`
                );
                return;
            }

            Alert.alert(
                "알림 권한",
                "알림 권한을 허용하지 않았어요. 일정 등록은 계속 사용할 수 있어요."
            );
        } catch (error) {
            console.error(
                "로컬 알림 권한 요청 오류:",
                error
            );

            Alert.alert(
                "오류",
                "알림 권한을 확인하는 중 문제가 발생했어요."
            );
        } finally {
            setNotificationBusy(false);
        }
    };

    const handleStart = async () => {
        if (startBusy) return;

        setStartBusy(true);

        try {
            /*
             * 1. 마이크 권한 요청
             */
            const micPermission =
                await getRecordingPermissionsAsync();

            if (
                !micPermission.granted &&
                micPermission.canAskAgain
            ) {
                await requestRecordingPermissionsAsync();
            }

            /*
             * 2. Android 실제 앱에서는
             * 일정 알림용 Notification Channel 생성
             */
            if (
                Platform.OS === "android" &&
                !IS_EXPO_GO
            ) {
                await setNotificationChannelAsync(
                    LOCAL_NOTIFICATION_CHANNEL_ID,
                    {
                        name: "일정 알림",
                        importance: AndroidImportance.DEFAULT,
                        sound: "default",
                    }
                );
            }

            /*
             * 3. 알림 권한 요청
             */
            if (Platform.OS !== "web") {
                const notificationPermission =
                    await getPermissionsAsync();

                if (
                    !isNotificationAllowed(notificationPermission) &&
                    notificationPermission.canAskAgain
                ) {
                    await requestPermissionsAsync({
                        ios: {
                            allowAlert: true,
                            allowBadge: false,
                            allowSound: true,
                        },
                    });
                }
            }

            /*
             * 4. 권한 허용/거부 여부와 상관없이
             * 최초 권한 안내를 완료한 것으로 저장
             */
            await AsyncStorage.setItem(
                STORAGE_KEYS.permissionOnboardingCompleted,
                "true"
            );

            /*
             * 5. Home 이동
             */
            router.replace("/");
        } catch (error) {
            console.error("권한 초기 설정 오류:", error);

            Alert.alert(
                "오류",
                "권한 설정 중 문제가 발생했어요."
            );
        } finally {
            setStartBusy(false);
        }
    };

    const isAnyBusy =
        microphoneBusy ||
        notificationBusy ||
        startBusy;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>
                        필요할 때 권한을 요청해요
                    </Text>

                    <Text style={styles.description}>
                        더 편리한 사용을 위해 선택 권한을{"\n"}
                        요청해요.
                    </Text>

                    <View style={styles.permissionList}>
                        <Pressable
                            style={[
                                styles.permissionCard,
                                isAnyBusy && styles.disabled,
                            ]}
                            onPress={handleMicrophonePress}
                            disabled={isAnyBusy}
                            accessibilityRole="button"
                            accessibilityState={{
                                disabled: isAnyBusy,
                                busy: microphoneBusy,
                            }}
                        >
                            <View style={styles.permissionIcon}>
                                <Ionicons
                                    name="mic-outline"
                                    size={26}
                                    color="#111111"
                                />
                            </View>

                            <View style={styles.permissionTextArea}>
                                <Text style={styles.permissionTitle}>
                                    마이크 · 선택
                                </Text>

                                <Text
                                    style={styles.permissionDescription}
                                >
                                    음성으로 일정을 입력할 때 사용해요
                                </Text>
                            </View>

                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#7B7F8A"
                            />
                        </Pressable>

                        <Pressable
                            style={[
                                styles.permissionCard,
                                isAnyBusy && styles.disabled,
                            ]}
                            onPress={handleNotificationPress}
                            disabled={isAnyBusy}
                            accessibilityRole="button"
                            accessibilityState={{
                                disabled: isAnyBusy,
                                busy: notificationBusy,
                            }}
                        >
                            <View style={styles.permissionIcon}>
                                <Ionicons
                                    name="notifications-outline"
                                    size={26}
                                    color="#111111"
                                />
                            </View>

                            <View style={styles.permissionTextArea}>
                                <Text style={styles.permissionTitle}>
                                    알림 · 선택
                                </Text>

                                <Text
                                    style={styles.permissionDescription}
                                >
                                    기기에 저장한 일정이 다가오면 알려드려요
                                </Text>
                            </View>

                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="#7B7F8A"
                            />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.bottomArea}>
                    <Text style={styles.helperText}>
                        허용하지 않아도 직접 입력으로 이용할 수 있어요.
                    </Text>

                    <Pressable
                        style={[
                            styles.startButton,
                            startBusy && styles.disabled,
                        ]}
                        onPress={handleStart}
                        disabled={startBusy}
                        accessibilityRole="button"
                        accessibilityState={{
                            disabled: startBusy,
                            busy: startBusy,
                        }}
                    >
                        <Text style={styles.startButtonText}>
                            {startBusy ? "설정 중..." : "시작하기"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    container: {
        flex: 1,
        paddingHorizontal: 24,
        backgroundColor: "#FFFFFF",
    },

    content: {
        flex: 1,
        paddingTop: 54,
    },

    title: {
        fontSize: 26,
        lineHeight: 36,
        fontWeight: "700",
        color: "#111111",
    },

    description: {
        marginTop: 14,
        fontSize: 15,
        lineHeight: 23,
        color: "#7B7F8A",
    },

    permissionList: {
        marginTop: 42,
        gap: 14,
    },

    permissionCard: {
        minHeight: 88,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#DDDFE4",
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },

    disabled: {
        opacity: 0.5,
    },

    permissionIcon: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },

    permissionTextArea: {
        flex: 1,
        marginLeft: 12,
    },

    permissionTitle: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: "600",
        color: "#111111",
    },

    permissionDescription: {
        marginTop: 5,
        fontSize: 13,
        lineHeight: 19,
        color: "#7B7F8A",
    },

    bottomArea: {
        paddingBottom: 20,
    },

    helperText: {
        marginBottom: 20,
        textAlign: "center",
        fontSize: 13,
        lineHeight: 19,
        color: "#7B7F8A",
    },

    startButton: {
        height: 56,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111111",
    },

    startButtonText: {
        fontSize: 17,
        lineHeight: 24,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});