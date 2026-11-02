package com.project.navi.domain.term.dto;

import com.project.navi.domain.term.entity.Term;

import java.time.Instant;
import java.util.UUID;

public record TermResponse(
        UUID id,
        String code,
        String version,
        String title,
        boolean required,
        String documentUrl,
        Instant effectiveAt
) {
    public static TermResponse from(Term term) {
        return new TermResponse(
                term.getId(), term.getCode(), term.getVersion(), term.getTitle(),
                term.isRequired(), term.getDocumentUrl(), term.getEffectiveAt());
    }
}
