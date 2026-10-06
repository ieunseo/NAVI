package com.project.navi.domain.member.dto;

import com.project.navi.domain.member.entity.MemberStatus;

import java.util.UUID;

public record MemberResponse(
        UUID id,
        String email,
        String nickname,
        MemberStatus status
) {
}
