package com.project.navi.domain.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;
/*
* 현재 로그인한 기기
* 회원이 로그인한 기록
* */
@Entity
@Table(name = "auth_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Column(
            name = "refresh_token_hash",
            nullable = false,
            columnDefinition = "text"
    )
    private String refreshTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthSessionStatus status = AuthSessionStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "revoked_reason", length = 50)
    private RevokedReason revokedReason;

    @Column(name = "refresh_token_expires_at", nullable = false)
    private Instant refreshTokenExpiresAt;

    @Column(name = "logged_in_at", nullable = false)
    private Instant loggedInAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static AuthSession create(
            UUID memberId,
            UUID deviceId,
            String refreshTokenHash,
            Instant refreshTokenExpiresAt) {
        Instant now = Instant.now();

        AuthSession session = new AuthSession();
        session.memberId = memberId;
        session.deviceId = deviceId;
        session.refreshTokenHash = refreshTokenHash;
        session.refreshTokenExpiresAt = refreshTokenExpiresAt;
        session.loggedInAt = now;
        session.lastSeenAt = now;
        session.createdAt = now;

        return session;
    }

    public boolean isActiveAt(Instant now) {
        return status == AuthSessionStatus.ACTIVE
                && refreshTokenExpiresAt.isAfter(now);
    }

    // 다른기기에서 로그인시 호출되는 메서드
    public void revokeForNewLogin(Instant now) {
        status = AuthSessionStatus.REVOKED;
        revokedReason = RevokedReason.REPLACED_BY_NEW_LOGIN;
        revokedAt = now;
    }

    public void rotateRefreshToken(String newHash, Instant now) {
        refreshTokenHash = newHash;
        lastSeenAt = now;
    }

    public void logout(Instant now) {
        status = AuthSessionStatus.LOGGED_OUT;
        revokedReason = RevokedReason.USER_LOGOUT;
        revokedAt = now;
    }
}