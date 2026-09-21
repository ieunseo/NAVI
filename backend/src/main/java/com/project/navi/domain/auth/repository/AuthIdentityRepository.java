package com.project.navi.domain.auth.repository;

import com.project.navi.domain.auth.entity.AuthIdentity;
import com.project.navi.domain.auth.entity.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AuthIdentityRepository
        extends JpaRepository<AuthIdentity, UUID> {

    @Query("""
            select a
            from AuthIdentity a
            where a.provider = :provider
              and lower(a.email) = lower(:email)
            """)
    Optional<AuthIdentity> findByProviderAndEmail(
            @Param("provider") AuthProvider provider,
            @Param("email") String email
    );
}