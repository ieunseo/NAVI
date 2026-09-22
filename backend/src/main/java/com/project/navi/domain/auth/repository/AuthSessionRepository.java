package com.project.navi.domain.auth.repository;

import com.project.navi.domain.auth.entity.AuthSession;
import com.project.navi.domain.auth.entity.AuthSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    List<AuthSession> findAllByMemberIdAndStatus(UUID memberId,AuthSessionStatus status);
}