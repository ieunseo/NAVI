package com.project.navi.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenRefreshRequest(
        @NotBlank(message = "다시 로그인해 주세요.")
        String refreshToken
) {
}
