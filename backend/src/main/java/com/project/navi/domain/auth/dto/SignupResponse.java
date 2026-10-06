package com.project.navi.domain.auth.dto;

/* 회원가입 성공 - 인증 메일을 보낸 주소 */
public record SignupResponse(
        String email
) {
}
