package com.project.navi.global.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/*
 * Refresh Token / 이메일 인증 토큰처럼
 * 원문은 사용자에게만 주고 DB에는 해시만 저장하는 토큰용
 */
public final class SecureTokenUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private SecureTokenUtils() {
    }

    /* 32바이트 랜덤 → URL에 그대로 넣을 수 있는 문자열 */
    public static String randomToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
