package com.project.navi.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

/* 가입 후 이메일 인증을 마쳐야 로그인할 수 있으므로 기기 정보는 받지 않는다 */
public record SignupRequest(
        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "올바른 이메일 주소를 입력해 주세요.")
        @Size(max = 320, message = "올바른 이메일 주소를 입력해 주세요.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 72, message = "비밀번호는 8자 이상 72자 이하로 입력해 주세요.")
        String password,

        @NotBlank(message = "닉네임을 입력해 주세요.")
        @Size(max = 8, message = "닉네임은 8자 이하로 입력해 주세요.")
        String nickname,

        @NotEmpty(message = "필수 약관에 동의해 주세요.")
        Set<UUID> agreedTermIds
) {
}
