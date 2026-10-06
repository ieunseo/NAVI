package com.project.navi.domain.auth.dto;

import com.project.navi.domain.member.dto.MemberResponse;

/* 로그인 / 회원가입 성공 응답 */
public record LoginResponse(
        TokenResponse token,
        MemberResponse member
) {
}
