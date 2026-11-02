package com.project.navi.domain.term.repository;

import com.project.navi.domain.term.entity.UserConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserConsentRepository extends JpaRepository<UserConsent, UUID> {
}
