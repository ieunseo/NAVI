package com.project.navi.domain.auth.repository;

import com.project.navi.domain.auth.entity.AuthSession;
import com.project.navi.domain.auth.entity.AuthSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    List<AuthSession> findAllByMemberIdAndStatus(UUID memberId,AuthSessionStatus status);

    /* 토큰 재발급 시 Refresh Token 해시로 세션 조회 */
    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);
}