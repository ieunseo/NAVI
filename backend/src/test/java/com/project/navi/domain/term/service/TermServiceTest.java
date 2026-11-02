package com.project.navi.domain.term.service;

import com.project.navi.domain.term.entity.Term;
import com.project.navi.domain.term.repository.TermRepository;
import com.project.navi.domain.term.repository.UserConsentRepository;
import com.project.navi.global.exception.ApiException;
import com.project.navi.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TermServiceTest {

    @Mock TermRepository termRepository;
    @Mock UserConsentRepository userConsentRepository;
    @InjectMocks TermService termService;

    @Test
    void rejectsSignupWhenAnyRequiredTermIsMissing() {
        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        Term first = term(firstId);
        Term second = term(secondId);
        when(termRepository.findAllByCurrentTrueAndRequiredTrueOrderByEffectiveAtAsc())
                .thenReturn(List.of(first, second));

        assertThatThrownBy(() -> termService.recordRequiredConsents(
                UUID.randomUUID(), Set.of(firstId), Instant.now()))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.REQUIRED_TERMS_NOT_AGREED));
    }

    @Test
    void savesConsentForEveryCurrentRequiredTerm() {
        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        Term first = term(firstId);
        Term second = term(secondId);
        when(termRepository.findAllByCurrentTrueAndRequiredTrueOrderByEffectiveAtAsc())
                .thenReturn(List.of(first, second));

        termService.recordRequiredConsents(
                UUID.randomUUID(), Set.of(firstId, secondId), Instant.now());

        verify(userConsentRepository).saveAll(anyList());
    }

    private Term term(UUID id) {
        Term term = mock(Term.class);
        when(term.getId()).thenReturn(id);
        return term;
    }
}
