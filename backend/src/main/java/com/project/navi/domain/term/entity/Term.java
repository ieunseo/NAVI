package com.project.navi.domain.term.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "terms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Term {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "text")
    private String code;

    @Column(nullable = false, columnDefinition = "text")
    private String version;

    @Column(nullable = false, columnDefinition = "text")
    private String title;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(name = "document_url", columnDefinition = "text")
    private String documentUrl;

    @Column(name = "is_current", nullable = false)
    private boolean current;

    @Column(name = "effective_at")
    private Instant effectiveAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
