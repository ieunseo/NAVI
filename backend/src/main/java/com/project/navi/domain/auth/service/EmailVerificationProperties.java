package com.project.navi.domain.auth.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/*
 * application.yaml 의 navi.email-verification.*
 * base-url        : 메일 속 인증 링크가 가리킬 서버 주소
 * from            : 보내는 사람
 * token-ttl       : 인증 링크 유효시간
 * resend-interval : 재발송 최소 간격
 */
@ConfigurationProperties(prefix = "navi.email-verification")
public record EmailVerificationProperties(
        String baseUrl,
        String from,
        Duration tokenTtl,
        Duration resendInterval
) {
}
