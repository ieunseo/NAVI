package com.project.navi.domain.auth.security;

import com.project.navi.domain.auth.security.JwtTokenProvider.AccessToken;
import com.project.navi.domain.auth.security.JwtTokenProvider.AccessTokenClaims;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-1234";

    private final JwtTokenProvider provider = new JwtTokenProvider(
            new JwtProperties(SECRET, "navi", Duration.ofMinutes(30), Duration.ofDays(14)));

    @Test
    void 발급한_액세스토큰을_검증하면_회원과_세션id가_나온다() {
        UUID memberId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        AccessToken token = provider.createAccessToken(memberId, sessionId, Instant.now());
        AccessTokenClaims claims = provider.parseAccessToken(token.value());

        assertThat(claims.memberId()).isEqualTo(memberId);
        assertThat(claims.sessionId()).isEqualTo(sessionId);
    }

    @Test
    void 만료된_토큰은_TOKEN_EXPIRED() {
        AccessToken token = provider.createAccessToken(
                UUID.randomUUID(), UUID.randomUUID(), Instant.now().minus(Duration.ofHours(1)));

        assertThatThrownBy(() -> provider.parseAccessToken(token.value()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.TOKEN_EXPIRED);
    }

    @Test
    void 다른_키로_서명된_토큰은_INVALID_TOKEN() {
        JwtTokenProvider other = new JwtTokenProvider(new JwtProperties(
                "another-secret-another-secret-another-1234", "navi",
                Duration.ofMinutes(30), Duration.ofDays(14)));
        AccessToken token = other.createAccessToken(UUID.randomUUID(), UUID.randomUUID(), Instant.now());

        assertThatThrownBy(() -> provider.parseAccessToken(token.value()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_TOKEN);
    }

    @Test
    void 리프레시토큰_해시는_같은_입력에_같은_값() {
        String refreshToken = provider.createRefreshToken();

        assertThat(provider.hashRefreshToken(refreshToken))
                .isEqualTo(provider.hashRefreshToken(refreshToken))
                .isNotEqualTo(refreshToken);
    }

    @Test
    void 짧은_시크릿은_거부한다() {
        assertThatThrownBy(() -> new JwtTokenProvider(
                new JwtProperties("short", "navi", Duration.ofMinutes(30), Duration.ofDays(14))))
                .isInstanceOf(IllegalStateException.class);
    }
}
