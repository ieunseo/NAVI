import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const INSTALLATION_ID_KEY = "navi.installationId";

export type DeviceInfo = {
    installationId: string;
    platform: "IOS" | "ANDROID";
    deviceName: string | null;
    appVersion: string | null;
};

function createUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        (char) => {
            const random = (Math.random() * 16) | 0;
            const value =
                char === "x" ? random : (random & 0x3) | 0x8;

            return value.toString(16);
        }
    );
}

/*
 * 앱 설치 단위 고유 ID
 *
 * 최초 실행 시 생성해 저장하고 이후 계속 같은 값을 사용합니다.
 * 앱을 삭제하면 함께 지워지므로 재설치 시 새 기기로 등록됩니다.
 */
async function getInstallationId() {
    const stored =
        await AsyncStorage.getItem(INSTALLATION_ID_KEY);

    if (stored) {
        return stored;
    }

    const installationId = createUuid();

    await AsyncStorage.setItem(
        INSTALLATION_ID_KEY,
        installationId
    );

    return installationId;
}

/*
 * 로그인 / 회원가입 요청에 함께 보내는 기기 정보
 *
 * 서버는 IOS / ANDROID 만 허용하므로
 * Expo Web 개발 환경은 ANDROID 로 보냅니다.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
    return {
        installationId: await getInstallationId(),
        platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        deviceName: Device.modelName ?? Device.deviceName ?? null,
        appVersion: Constants.expoConfig?.version ?? null,
    };
}
