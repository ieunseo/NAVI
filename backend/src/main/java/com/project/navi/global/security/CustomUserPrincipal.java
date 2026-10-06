package com.project.navi.global.security;

import java.util.UUID;

/*
 * Access Token 검증 후 SecurityContext에 저장되는 로그인 사용자
 * 컨트롤러에서 @AuthenticationPrincipal CustomUserPrincipal 로 꺼내 쓴다.
 */
public record CustomUserPrincipal(
        UUID memberId,
        UUID sessionId
) {
}
