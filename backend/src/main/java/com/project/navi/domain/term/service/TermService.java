package com.project.navi.domain.term.service;

import com.project.navi.domain.term.dto.TermResponse;
import com.project.navi.domain.term.entity.Term;
import com.project.navi.domain.term.entity.UserConsent;
import com.project.navi.domain.term.repository.TermRepository;
import com.project.navi.domain.term.repository.UserConsentRepository;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TermService {

    private final TermRepository termRepository;
    private final UserConsentRepository userConsentRepository;

    public List<TermResponse> getCurrentRequiredTerms() {
        return getRequiredTerms().stream()
                .map(TermResponse::from)
                .toList();
    }

    @Transactional
    public void recordRequiredConsents(
            UUID memberId,
            Set<UUID> agreedTermIds,
            Instant agreedAt
    ) {
        List<Term> requiredTerms = getRequiredTerms();
        Set<UUID> requiredIds = requiredTerms.stream()
                .map(Term::getId)
                .collect(Collectors.toSet());

        if (requiredIds.isEmpty()
                || agreedTermIds == null
                || !new HashSet<>(agreedTermIds).equals(requiredIds)) {
            throw new ApiException(ErrorCode.REQUIRED_TERMS_NOT_AGREED);
        }

        List<UserConsent> consents = requiredTerms.stream()
                .map(term -> UserConsent.agree(memberId, term.getId(), agreedAt))
                .toList();

        userConsentRepository.saveAll(consents);
    }

    private List<Term> getRequiredTerms() {
        return termRepository.findAllByCurrentTrueAndRequiredTrueOrderByEffectiveAtAsc();
    }
}
