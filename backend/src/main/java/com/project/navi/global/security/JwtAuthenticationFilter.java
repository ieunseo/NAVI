package com.project.navi.global.security;

import com.project.navi.domain.auth.entity.AuthSession;
import com.project.navi.domain.auth.repository.AuthSessionRepository;
import com.project.navi.domain.auth.security.JwtTokenProvider;
import com.project.navi.domain.auth.security.JwtTokenProvider.AccessTokenClaims;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/*
 * Authorization: Bearer {accessToken} 검증
 *
 * 1. JWT 서명 / 만료 확인
 * 2. 토큰의 세션(sid)이 아직 ACTIVE 인지 확인 → 1세션 1로그인
 *    (다른 기기에서 로그인하면 기존 세션이 REVOKED 되어 바로 막힌다)
 *
 * 실패해도 여기서 응답하지 않고 에러코드만 남긴다.
 * 인증이 필요한 API라면 CustomAuthenticationEntryPoint 가 401을 내려준다.
 *
 * @Component 로 등록하면 서블릿 필터로도 한 번 더 등록되므로 SecurityConfig 에서 직접 생성한다.
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ERROR_ATTRIBUTE = "navi.auth.error";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final AuthSessionRepository authSessionRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            try {
                AccessTokenClaims claims =
                        jwtTokenProvider.parseAccessToken(header.substring(BEARER_PREFIX.length()));

                AuthSession session = authSessionRepository.findById(claims.sessionId())
                        .filter(s -> s.getMemberId().equals(claims.memberId()))
                        .orElseThrow(() -> new ApiException(ErrorCode.INVALID_TOKEN));

                if (!session.isActiveAt(Instant.now())) {
                    throw new ApiException(session.isReplacedByNewLogin()
                            ? ErrorCode.SESSION_REVOKED
                            : ErrorCode.INVALID_TOKEN);
                }

                CustomUserPrincipal principal =
                        new CustomUserPrincipal(claims.memberId(), claims.sessionId());

                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(principal, null, List.of()));
            } catch (ApiException e) {
                SecurityContextHolder.clearContext();
                request.setAttribute(ERROR_ATTRIBUTE, e.getErrorCode());
            }
        }

        filterChain.doFilter(request, response);
    }
}
