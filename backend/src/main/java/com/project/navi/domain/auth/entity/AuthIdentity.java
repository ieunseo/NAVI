package com.project.navi.domain.auth.entity;

import com.project.navi.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "auth_identities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthIdentity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "password_hash", columnDefinition = "text")
    private String passwordHash;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    public static AuthIdentity createLocal(
            UUID memberId,
            String email,
            String encodedPassword
    ) {
        AuthIdentity identity = new AuthIdentity();
        identity.memberId = memberId;
        identity.provider = AuthProvider.LOCAL;
        identity.email = email.strip().toLowerCase(Locale.ROOT);
        identity.passwordHash = encodedPassword;
        return identity;
    }
}