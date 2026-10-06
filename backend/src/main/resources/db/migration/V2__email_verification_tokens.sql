-- =========================================================
-- EMAIL VERIFICATION TOKENS
--
-- 회원가입 이메일 인증 링크
--
-- 토큰 원문은 메일로만 보내고 DB에는 Hash만 저장한다.
-- 인증 완료 시 auth_identities.email_verified_at 을 채운다.
-- =========================================================

CREATE TABLE email_verification_tokens (
                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                           identity_id UUID NOT NULL,

                                           token_hash TEXT NOT NULL,

                                           expires_at TIMESTAMPTZ NOT NULL,

                                           used_at TIMESTAMPTZ,

                                           created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                           CONSTRAINT email_verification_tokens_identity_fk
                                               FOREIGN KEY (identity_id)
                                                   REFERENCES auth_identities(id)
                                                   ON DELETE CASCADE
);


CREATE UNIQUE INDEX uq_email_verification_tokens_hash
    ON email_verification_tokens(token_hash);


CREATE INDEX idx_email_verification_tokens_identity_id
    ON email_verification_tokens(identity_id);
