package com.project.navi.domain.auth.security;

import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import com.project.navi.global.security.SecureTokenUtils;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

/*
 * Access Token  : JWT(HS256), sub = memberId, sid = 세션 id
 * Refresh Token : 랜덤 문자열 (DB에는 SHA-256 해시만 저장)
 */
@Component
public class JwtTokenProvider {

    private static final String SESSION_CLAIM = "sid";
    private static final int MIN_SECRET_BYTES = 32;

    private final JwtProperties properties;
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    public JwtTokenProvider(JwtProperties properties) {
        if (properties.secret() == null
                || properties.secret().getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "navi.jwt.secret(JWT_SECRET)은 32바이트 이상이어야 합니다.");
        }

        SecretKey key = new SecretKeySpec(
                properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");

        this.properties = properties;
        this.encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    public record AccessToken(String value, Instant expiresAt) {
    }

    public record AccessTokenClaims(UUID memberId, UUID sessionId) {
    }

    public AccessToken createAccessToken(UUID memberId, UUID sessionId, Instant now) {
        Instant expiresAt = now.plus(properties.accessTokenTtl());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(memberId.toString())
                .claim(SESSION_CLAIM, sessionId.toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String value = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AccessToken(value, expiresAt);
    }

    /* 서명·만료 검증 후 claim 추출. 실패 시 TOKEN_EXPIRED / INVALID_TOKEN */
    public AccessTokenClaims parseAccessToken(String token) {
        Jwt jwt;
        try {
            jwt = decoder.decode(token);
        } catch (JwtValidationException e) {
            boolean expired = e.getErrors().stream()
                    .anyMatch(error -> error.getDescription() != null
                            && error.getDescription().contains("expired"));
            throw new ApiException(expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.INVALID_TOKEN);
        } catch (JwtException e) {
            throw new ApiException(ErrorCode.INVALID_TOKEN);
        }

        try {
            return new AccessTokenClaims(
                    UUID.fromString(jwt.getSubject()),
                    UUID.fromString(jwt.getClaimAsString(SESSION_CLAIM)));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ApiException(ErrorCode.INVALID_TOKEN);
        }
    }

    public String createRefreshToken() {
        return SecureTokenUtils.randomToken();
    }

    public Instant refreshTokenExpiresAt(Instant now) {
        return now.plus(properties.refreshTokenTtl());
    }

    /* Refresh Token 원문은 저장하지 않는다 */
    public String hashRefreshToken(String refreshToken) {
        return SecureTokenUtils.sha256(refreshToken);
    }
}
