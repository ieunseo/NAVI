package com.project.navi.domain.member.service;

import com.project.navi.domain.auth.entity.AuthIdentity;
import com.project.navi.domain.auth.entity.AuthProvider;
import com.project.navi.domain.auth.repository.AuthIdentityRepository;
import com.project.navi.domain.member.dto.MemberResponse;
import com.project.navi.domain.member.entity.Member;
import com.project.navi.domain.member.entity.Profile;
import com.project.navi.domain.member.repository.MemberRepository;
import com.project.navi.domain.member.repository.ProfileRepository;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberServiceImpl implements MemberService{

    private final MemberRepository memberRepository;
    private final ProfileRepository profileRepository;
    private final AuthIdentityRepository authIdentityRepository;

    @Override
    public MemberResponse getMember(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        String nickname = profileRepository.findById(memberId)
                .map(Profile::getNickname)
                .orElse(null);

        String email = authIdentityRepository.findByMemberIdAndProvider(memberId, AuthProvider.LOCAL)
                .map(AuthIdentity::getEmail)
                .orElse(null);

        return new MemberResponse(member.getId(), email, nickname, member.getStatus());
    }
}
