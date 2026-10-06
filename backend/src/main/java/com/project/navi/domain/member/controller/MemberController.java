package com.project.navi.domain.member.controller;

import com.project.navi.domain.member.dto.MemberResponse;
import com.project.navi.domain.member.service.MemberService;
import com.project.navi.global.response.ApiResponse;
import com.project.navi.global.security.CustomUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /* 내 정보 */
    @GetMapping("/me")
    public ApiResponse<MemberResponse> me(@AuthenticationPrincipal CustomUserPrincipal principal) {
        return ApiResponse.ok(memberService.getMember(principal.memberId()));
    }
}
