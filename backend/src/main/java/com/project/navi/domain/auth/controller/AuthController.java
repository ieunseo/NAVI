package com.project.navi.domain.auth.controller;

import com.project.navi.domain.auth.dto.EmailVerificationResendRequest;
import com.project.navi.domain.auth.dto.LoginRequest;
import com.project.navi.domain.auth.dto.LoginResponse;
import com.project.navi.domain.auth.dto.SignupRequest;
import com.project.navi.domain.auth.dto.SignupResponse;
import com.project.navi.domain.auth.dto.TokenRefreshRequest;
import com.project.navi.domain.auth.dto.TokenResponse;
import com.project.navi.domain.auth.service.AuthService;
import com.project.navi.domain.auth.service.EmailVerificationService;
import com.project.navi.domain.auth.service.EmailVerificationService.VerifyResult;
import com.project.navi.global.response.ApiResponse;
import com.project.navi.global.security.CustomUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/signup")
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@AuthenticationPrincipal CustomUserPrincipal principal) {
        authService.logout(principal);
        return ApiResponse.ok();
    }

    @PostMapping("/verify-email/resend")
    public ApiResponse<Void> resendVerificationEmail(
            @Valid @RequestBody EmailVerificationResendRequest request
    ) {
        emailVerificationService.resend(request.email());
        return ApiResponse.ok();
    }

    /* 메일 속 인증 링크 - 브라우저로 열리므로 HTML 로 응답한다 */
    @GetMapping(value = "/verify-email", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public String verifyEmail(@RequestParam(required = false) String token) {
        VerifyResult result = emailVerificationService.verify(token);

        return switch (result) {
            case VERIFIED -> resultPage(
                    "이메일 인증이 완료되었어요",
                    "NAVI 앱으로 돌아가 로그인해 주세요.");
            case ALREADY_VERIFIED -> resultPage(
                    "이미 인증된 이메일이에요",
                    "NAVI 앱에서 로그인해 주세요.");
            case INVALID -> resultPage(
                    "인증 링크가 만료되었거나 올바르지 않아요",
                    "앱의 로그인 화면에서 인증 메일을 다시 받아 주세요.");
        };
    }

    private String resultPage(String title, String description) {
        return """
                <!doctype html>
                <html lang="ko">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>NAVI</title>
                </head>
                <body style="font-family:sans-serif;margin:0;min-height:100vh;display:flex;
                             align-items:center;justify-content:center;text-align:center;color:#222">
                  <div style="padding:24px">
                    <h2 style="margin:0 0 12px">%s</h2>
                    <p style="margin:0;color:#666;line-height:1.6">%s</p>
                  </div>
                </body>
                </html>
                """.formatted(title, description);
    }
}
