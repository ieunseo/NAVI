package com.project.navi.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailVerificationResendRequest(
        @NotBlank(message = "이메일을 입력해 주세요.")
        String email
) {
}
