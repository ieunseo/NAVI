package com.project.navi.domain.auth.dto;

import com.project.navi.domain.device.dto.DeviceRegisterRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotBlank(message = "이메일을 입력해 주세요.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        String password,

        @Valid
        @NotNull(message = "기기 정보가 필요해요.")
        DeviceRegisterRequest device
) {
}
