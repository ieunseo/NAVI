package com.project.navi.domain.member.entity;

import com.project.navi.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile extends BaseTimeEntity {

    /* 이미 생성된 members.id를 기본키이자 외래키 */
    @Id
    @Column(name = "member_id")
    private UUID memberId;

    @Column(nullable = false, length = 8)
    private String nickname;

    @Column(nullable = false, columnDefinition = "text")
    private String timezone = "Asia/Seoul";

    @Column(name = "push_enabled", nullable = false)
    private boolean pushEnabled = true;

    @Column(name = "signup_completed_at")
    private Instant signupCompletedAt;

    public static Profile create(UUID memberId, String nickname) {
        Profile profile = new Profile();
        profile.memberId = memberId;
        profile.nickname = nickname;
        return profile;
    }

    public void completeSignup(Instant completedAt) {
        this.signupCompletedAt = completedAt;
    }
}