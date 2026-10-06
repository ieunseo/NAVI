package com.project.navi.domain.device.dto;

import com.project.navi.domain.device.entity.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/*
 * 로그인 / 회원가입 시 함께 보내는 기기 정보
 * installationId : 앱 최초 설치 시 클라이언트가 생성해 보관하는 고유 ID
 */
public record DeviceRegisterRequest(
        @NotBlank(message = "기기 정보가 필요해요.")
        String installationId,

        @NotNull(message = "기기 정보가 필요해요.")
        DevicePlatform platform,

        String deviceName,

        String appVersion
) {
}
