package com.project.navi.domain.auth.repository;

import com.project.navi.domain.auth.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    /* 재발송 간격 제한용 - 가장 최근 발급 토큰 */
    Optional<EmailVerificationToken> findTopByIdentityIdOrderByCreatedAtDesc(UUID identityId);
}
