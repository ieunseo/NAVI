package com.project.navi.domain.term.entity;

import com.project.navi.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_consents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserConsent extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(name = "term_id", nullable = false)
    private UUID termId;

    @Column(name = "is_agreed", nullable = false)
    private boolean agreed;

    @Column(name = "agreed_at")
    private Instant agreedAt;

    public static UserConsent agree(UUID memberId, UUID termId, Instant agreedAt) {
        UserConsent consent = new UserConsent();
        consent.memberId = memberId;
        consent.termId = termId;
        consent.agreed = true;
        consent.agreedAt = agreedAt;
        return consent;
    }
}
