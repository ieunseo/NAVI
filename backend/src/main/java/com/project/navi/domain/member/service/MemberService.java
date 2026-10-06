package com.project.navi.domain.member.service;

import com.project.navi.domain.member.dto.MemberResponse;

import java.util.UUID;

public interface MemberService {

    MemberResponse getMember(UUID memberId);
}
