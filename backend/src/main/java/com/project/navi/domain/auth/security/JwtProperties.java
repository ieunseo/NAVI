package com.project.navi.domain.auth.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/*
 * application.yaml 의 navi.jwt.*
 * secret : HS256 서명 키 (32바이트 이상)
 */
@ConfigurationProperties(prefix = "navi.jwt")
public record JwtProperties(
        String secret,
        String issuer,
        Duration accessTokenTtl,
        Duration refreshTokenTtl
) {
}
