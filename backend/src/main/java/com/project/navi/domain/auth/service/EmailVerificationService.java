package com.project.navi.domain.auth.service;

import com.project.navi.domain.auth.entity.AuthIdentity;
import com.project.navi.domain.auth.entity.AuthProvider;
import com.project.navi.domain.auth.entity.EmailVerificationToken;
import com.project.navi.domain.auth.repository.AuthIdentityRepository;
import com.project.navi.domain.auth.repository.EmailVerificationTokenRepository;
import com.project.navi.global.security.SecureTokenUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmailVerificationService {

    private final AuthIdentityRepository authIdentityRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailVerificationProperties properties;
    private final ApplicationEventPublisher eventPublisher;

    public enum VerifyResult {
        VERIFIED,
        ALREADY_VERIFIED,
        INVALID
    }

    /* 메일 발송 요청 - 실제 발송은 커밋 이후 EmailVerificationMailSender 가 한다 */
    public record EmailVerificationRequestedEvent(String email, String token) {
    }

    /* 인증 링크 발급 + 메일 발송 */
    public void send(AuthIdentity identity) {
        Instant now = Instant.now();
        String token = SecureTokenUtils.randomToken();

        tokenRepository.save(EmailVerificationToken.create(
                identity.getId(),
                SecureTokenUtils.sha256(token),
                now.plus(properties.tokenTtl())));

        eventPublisher.publishEvent(new EmailVerificationRequestedEvent(identity.getEmail(), token));
    }

    /*
     * 인증 메일 재발송
     * 가입 여부가 드러나지 않도록 결과와 상관없이 항상 성공으로 응답한다.
     */
    public void resend(String email) {
        Optional<AuthIdentity> found =
                authIdentityRepository.findByProviderAndEmail(AuthProvider.LOCAL, email.strip());

        if (found.isEmpty() || found.get().isEmailVerified()) {
            return;
        }

        AuthIdentity identity = found.get();
        Instant now = Instant.now();

        boolean tooSoon = tokenRepository.findTopByIdentityIdOrderByCreatedAtDesc(identity.getId())
                .map(last -> last.getCreatedAt().plus(properties.resendInterval()).isAfter(now))
                .orElse(false);

        if (!tooSoon) {
            send(identity);
        }
    }

    /* 메일 속 링크 클릭 */
    public VerifyResult verify(String token) {
        if (token == null || token.isBlank()) {
            return VerifyResult.INVALID;
        }

        Instant now = Instant.now();

        Optional<EmailVerificationToken> found =
                tokenRepository.findByTokenHash(SecureTokenUtils.sha256(token));

        if (found.isEmpty()) {
            return VerifyResult.INVALID;
        }

        EmailVerificationToken verificationToken = found.get();

        AuthIdentity identity = authIdentityRepository.findById(verificationToken.getIdentityId())
                .orElse(null);

        if (identity == null) {
            return VerifyResult.INVALID;
        }

        if (identity.isEmailVerified()) {
            return VerifyResult.ALREADY_VERIFIED;
        }

        if (!verificationToken.isUsableAt(now)) {
            return VerifyResult.INVALID;
        }

        verificationToken.use(now);
        identity.verifyEmail(now);
        return VerifyResult.VERIFIED;
    }
}
