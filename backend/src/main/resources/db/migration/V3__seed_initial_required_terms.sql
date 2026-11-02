CREATE UNIQUE INDEX uq_terms_current_code
    ON terms(code)
    WHERE is_current = TRUE;

INSERT INTO terms (
    code, version, title, is_required, document_url, is_current, effective_at
) VALUES
    (
        'SERVICE_TERMS', '1.0', '서비스 이용약관', TRUE,
        NULL, TRUE, TIMESTAMPTZ '2026-09-10 00:00:00+09'
    ),
    (
        'PRIVACY_COLLECTION', '1.0', '개인정보 수집 및 이용', TRUE,
        NULL, TRUE, TIMESTAMPTZ '2026-09-10 00:00:00+09'
    );
