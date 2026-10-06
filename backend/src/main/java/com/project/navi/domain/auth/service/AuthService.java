package com.project.navi.domain.auth.service;

import com.project.navi.domain.auth.dto.LoginRequest;
import com.project.navi.domain.auth.dto.LoginResponse;
import com.project.navi.domain.auth.dto.SignupRequest;
import com.project.navi.domain.auth.dto.SignupResponse;
import com.project.navi.domain.auth.dto.TokenRefreshRequest;
import com.project.navi.domain.auth.dto.TokenResponse;
import com.project.navi.domain.auth.entity.AuthIdentity;
import com.project.navi.domain.auth.entity.AuthProvider;
import com.project.navi.domain.auth.entity.AuthSession;
import com.project.navi.domain.auth.entity.AuthSessionStatus;
import com.project.navi.domain.auth.repository.AuthIdentityRepository;
import com.project.navi.domain.auth.repository.AuthSessionRepository;
import com.project.navi.domain.auth.security.JwtTokenProvider;
import com.project.navi.domain.auth.security.JwtTokenProvider.AccessToken;
import com.project.navi.domain.device.dto.DeviceRegisterRequest;
import com.project.navi.domain.device.entity.UserDevice;
import com.project.navi.domain.device.service.DeviceService;
import com.project.navi.domain.member.entity.Member;
import com.project.navi.domain.member.entity.Profile;
import com.project.navi.domain.member.repository.MemberRepository;
import com.project.navi.domain.member.repository.ProfileRepository;
import com.project.navi.domain.member.service.MemberService;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import com.project.navi.global.security.CustomUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final MemberRepository memberRepository;
    private final ProfileRepository profileRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final AuthSessionRepository authSessionRepository;
    private final DeviceService deviceService;
    private final EmailVerificationService emailVerificationService;
    private final MemberService memberService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    /* 회원가입 → 인증 메일 발송 (인증 완료 후 로그인 가능) */
    public SignupResponse signup(SignupRequest request) {
        String email = request.email().strip().toLowerCase(Locale.ROOT);

        if (authIdentityRepository.findByProviderAndEmail(AuthProvider.LOCAL, email).isPresent()) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Instant now = Instant.now();

        Member member = memberRepository.save(Member.create());

        AuthIdentity identity = authIdentityRepository.save(AuthIdentity.createLocal(
                member.getId(),
                email,
                passwordEncoder.encode(request.password())));

        Profile profile = Profile.create(member.getId(), request.nickname().strip());
        profile.completeSignup(now);
        profileRepository.save(profile);

        emailVerificationService.send(identity);

        return new SignupResponse(email);
    }

    public LoginResponse login(LoginRequest request) {
        AuthIdentity identity = authIdentityRepository
                .findByProviderAndEmail(AuthProvider.LOCAL, request.email().strip())
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), identity.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!identity.isEmailVerified()) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        /* 같은 회원의 동시 로그인을 줄 세워 ACTIVE 세션이 2개 생기지 않게 한다 */
        Member member = memberRepository.findByIdForUpdate(identity.getMemberId())
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        if (!member.isActive()) {
            throw new ApiException(ErrorCode.MEMBER_NOT_ACTIVE);
        }

        return startSession(member.getId(), request.device(), Instant.now());
    }

    /* Access Token 재발급 + Refresh Token 교체(rotation) */
    public TokenResponse refresh(TokenRefreshRequest request) {
        Instant now = Instant.now();

        AuthSession session = authSessionRepository
                .findByRefreshTokenHash(jwtTokenProvider.hashRefreshToken(request.refreshToken()))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (session.isReplacedByNewLogin()) {
            throw new ApiException(ErrorCode.SESSION_REVOKED);
        }

        if (!session.isActiveAt(now)) {
            throw new ApiException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        boolean memberActive = memberRepository.findById(session.getMemberId())
                .map(Member::isActive)
                .orElse(false);

        if (!memberActive) {
            throw new ApiException(ErrorCode.MEMBER_NOT_ACTIVE);
        }

        String refreshToken = jwtTokenProvider.createRefreshToken();
        session.rotateRefreshToken(jwtTokenProvider.hashRefreshToken(refreshToken), now);

        AccessToken accessToken =
                jwtTokenProvider.createAccessToken(session.getMemberId(), session.getId(), now);

        return new TokenResponse(
                accessToken.value(),
                accessToken.expiresAt(),
                refreshToken,
                session.getRefreshTokenExpiresAt());
    }

    public void logout(CustomUserPrincipal principal) {
        Instant now = Instant.now();

        authSessionRepository.findById(principal.sessionId())
                .filter(session -> session.isActiveAt(now))
                .ifPresent(session -> session.logout(now));
    }

    /*
     * 1세션 1로그인
     * 기존 ACTIVE 세션을 REVOKED 처리한 뒤 새 세션을 만든다.
     */
    private LoginResponse startSession(UUID memberId, DeviceRegisterRequest deviceRequest, Instant now) {
        UserDevice device = deviceService.registerOrUpdate(deviceRequest);

        authSessionRepository.findAllByMemberIdAndStatus(memberId, AuthSessionStatus.ACTIVE)
                .forEach(session -> session.revokeForNewLogin(now));

        /*
         * Hibernate는 flush 시 INSERT를 UPDATE보다 먼저 실행한다.
         * 먼저 flush 하지 않으면 새 세션 INSERT가 uq_auth_sessions_active_member 에 걸린다.
         */
        authSessionRepository.flush();

        String refreshToken = jwtTokenProvider.createRefreshToken();

        AuthSession session = authSessionRepository.save(AuthSession.create(
                memberId,
                device.getId(),
                jwtTokenProvider.hashRefreshToken(refreshToken),
                jwtTokenProvider.refreshTokenExpiresAt(now)));

        AccessToken accessToken = jwtTokenProvider.createAccessToken(memberId, session.getId(), now);

        TokenResponse token = new TokenResponse(
                accessToken.value(),
                accessToken.expiresAt(),
                refreshToken,
                session.getRefreshTokenExpiresAt());

        return new LoginResponse(token, memberService.getMember(memberId));
    }
}
