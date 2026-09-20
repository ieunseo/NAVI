-- =========================================================
-- NAVI Initial Schema
-- Flyway Migration: V0
-- PostgreSQL 16+
-- =========================================================


-- =========================================================
-- 1. MEMBERS
--
-- NAVI 서비스 회원
--
-- 비회원(GUEST)은 이 테이블에 생성하지 않는다.
-- 비회원 일정은 클라이언트 로컬에서만 관리한다.
-- =========================================================

CREATE TABLE members (
                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                         status VARCHAR(20) NOT NULL DEFAULT 'active',

                         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         withdrawn_at TIMESTAMPTZ,

                         CONSTRAINT members_status_check
                             CHECK (status IN (
                                               'active',
                                               'withdrawn',
                                               'suspended'
                                 ))
);


-- =========================================================
-- 2. AUTH IDENTITIES
--
-- 회원의 로그인 수단
--
-- LOCAL  : 이메일 + 비밀번호
-- GOOGLE : Google OAuth (추후 구현)
--
-- Member와 로그인 수단을 분리하여
-- 향후 하나의 회원이 여러 로그인 Provider를 가질 수 있도록 한다.
-- =========================================================

CREATE TABLE auth_identities (
                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                 member_id UUID NOT NULL,

                                 provider VARCHAR(20) NOT NULL,

                                 email VARCHAR(320) NOT NULL,

                                 password_hash TEXT,

                                 provider_user_id TEXT,

                                 email_verified_at TIMESTAMPTZ,

                                 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT auth_identities_member_fk
                                     FOREIGN KEY (member_id)
                                         REFERENCES members(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT auth_identities_provider_check
                                     CHECK (provider IN (
                                                         'local',
                                                         'google'
                                         )),

                                 CONSTRAINT auth_identities_provider_data_check
                                     CHECK (
                                         (
                                             provider = 'local'
                                                 AND password_hash IS NOT NULL
                                             )
                                             OR
                                         (
                                             provider = 'google'
                                                 AND provider_user_id IS NOT NULL
                                             )
                                         )
);


-- 같은 Provider에서 이메일 중복 가입 방지
CREATE UNIQUE INDEX uq_auth_identities_provider_email
    ON auth_identities (
                        provider,
                        LOWER(email)
        );


-- Provider 회원 식별값 중복 방지
CREATE UNIQUE INDEX uq_auth_identities_provider_user_id
    ON auth_identities (
                        provider,
                        provider_user_id
        )
    WHERE provider_user_id IS NOT NULL;


CREATE INDEX idx_auth_identities_member_id
    ON auth_identities(member_id);


-- =========================================================
-- 3. PROFILES
-- =========================================================

CREATE TABLE profiles (
                          member_id UUID PRIMARY KEY,

                          nickname VARCHAR(8) NOT NULL,

                          timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',

                          push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

                          signup_completed_at TIMESTAMPTZ,

                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT profiles_member_fk
                              FOREIGN KEY (member_id)
                                  REFERENCES members(id)
                                  ON DELETE CASCADE,

                          CONSTRAINT profiles_nickname_length_check
                              CHECK (
                                  CHAR_LENGTH(nickname) BETWEEN 1 AND 8
                                  )
);


-- =========================================================
-- 4. TERMS
-- =========================================================

CREATE TABLE terms (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                       code TEXT NOT NULL,

                       version TEXT NOT NULL,

                       title TEXT NOT NULL,

                       is_required BOOLEAN NOT NULL DEFAULT TRUE,

                       document_url TEXT,

                       is_current BOOLEAN NOT NULL DEFAULT TRUE,

                       effective_at TIMESTAMPTZ,

                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT uq_terms_code_version
                           UNIQUE (code, version)
);


-- =========================================================
-- 5. USER CONSENTS
-- =========================================================

CREATE TABLE user_consents (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                               member_id UUID NOT NULL,

                               term_id UUID NOT NULL,

                               is_agreed BOOLEAN NOT NULL DEFAULT FALSE,

                               agreed_at TIMESTAMPTZ,

                               created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT user_consents_member_fk
                                   FOREIGN KEY (member_id)
                                       REFERENCES members(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT user_consents_term_fk
                                   FOREIGN KEY (term_id)
                                       REFERENCES terms(id),

                               CONSTRAINT uq_user_consents_member_term
                                   UNIQUE (member_id, term_id)
);


CREATE INDEX idx_user_consents_member_id
    ON user_consents(member_id);


-- =========================================================
-- 6. APP DEVICES
--
-- 앱 설치 단위 Device
--
-- installation_id:
-- 앱 최초 설치 시 클라이언트가 생성하는 고유 ID
-- =========================================================

CREATE TABLE app_devices (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                             installation_id TEXT NOT NULL UNIQUE,

                             platform VARCHAR(20) NOT NULL,

                             device_name TEXT,

                             app_version TEXT,

                             created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             CONSTRAINT app_devices_platform_check
                                 CHECK (platform IN (
                                                     'ios',
                                                     'android'
                                     ))
);


-- =========================================================
-- 7. AUTH SESSIONS
--
-- Spring 인증 세션
--
-- 기존 Supabase auth session 대체
--
-- refresh_token 원문은 저장하지 않는다.
-- Hash만 저장한다.
--
-- 한 회원당 ACTIVE 세션 1개만 허용한다.
-- =========================================================

CREATE TABLE auth_sessions (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                               member_id UUID NOT NULL,

                               device_id UUID NOT NULL,

                               refresh_token_hash TEXT NOT NULL,

                               status VARCHAR(20) NOT NULL DEFAULT 'active',

                               revoked_reason VARCHAR(50),

                               refresh_token_expires_at TIMESTAMPTZ NOT NULL,

                               logged_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               revoked_at TIMESTAMPTZ,

                               created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT auth_sessions_member_fk
                                   FOREIGN KEY (member_id)
                                       REFERENCES members(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT auth_sessions_device_fk
                                   FOREIGN KEY (device_id)
                                       REFERENCES app_devices(id),

                               CONSTRAINT auth_sessions_status_check
                                   CHECK (status IN (
                                                     'active',
                                                     'revoked',
                                                     'logged_out',
                                                     'expired'
                                       )),

                               CONSTRAINT auth_sessions_revoked_reason_check
                                   CHECK (
                                       revoked_reason IS NULL
                                           OR revoked_reason IN (
                                                                 'replaced_by_new_login',
                                                                 'user_logout',
                                                                 'withdrawal',
                                                                 'expired',
                                                                 'admin'
                                           )
                                       )
);


CREATE INDEX idx_auth_sessions_member_id
    ON auth_sessions(member_id);


CREATE INDEX idx_auth_sessions_device_id
    ON auth_sessions(device_id);


-- 한 회원에게 active session은 최대 하나
--
-- 다른 기기에서 로그인하면
-- 기존 active session을 먼저 revoked 처리한 후
-- 새 session을 생성한다.
CREATE UNIQUE INDEX uq_auth_sessions_active_member
    ON auth_sessions(member_id)
    WHERE status = 'active';


-- =========================================================
-- 8. USER ACCESS
--
-- 무료 / 체험 / 구독 / 이용권 상태
--
-- Premium 여부를 Member role로 관리하지 않고
-- entitlement 개념으로 별도 관리한다.
-- =========================================================

CREATE TABLE user_access (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                             member_id UUID NOT NULL,

                             access_type VARCHAR(30) NOT NULL,

                             status VARCHAR(20) NOT NULL DEFAULT 'active',

                             starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             ends_at TIMESTAMPTZ,

                             quota_total INTEGER,

                             quota_used INTEGER NOT NULL DEFAULT 0,

                             provider TEXT,

                             external_reference TEXT,

                             created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             CONSTRAINT user_access_member_fk
                                 FOREIGN KEY (member_id)
                                     REFERENCES members(id)
                                     ON DELETE CASCADE,

                             CONSTRAINT user_access_type_check
                                 CHECK (access_type IN (
                                                        'trial',
                                                        'subscription',
                                                        'usage_pack',
                                                        'free'
                                     )),

                             CONSTRAINT user_access_status_check
                                 CHECK (status IN (
                                                   'active',
                                                   'expired',
                                                   'cancelled'
                                     )),

                             CONSTRAINT user_access_quota_total_check
                                 CHECK (
                                     quota_total IS NULL
                                         OR quota_total >= 0
                                     ),

                             CONSTRAINT user_access_quota_used_check
                                 CHECK (quota_used >= 0),

                             CONSTRAINT user_access_period_check
                                 CHECK (
                                     ends_at IS NULL
                                         OR ends_at >= starts_at
                                     )
);


CREATE INDEX idx_user_access_member_status
    ON user_access(member_id, status);


-- =========================================================
-- 9. TASK SERIES
--
-- 반복 일정 원본
-- =========================================================

CREATE TABLE task_series (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                             member_id UUID NOT NULL,

                             recurrence_type VARCHAR(20) NOT NULL,

                             title TEXT NOT NULL,

                             memo TEXT,

                             scheduled_time TIME NOT NULL,

                             reminder_minutes INTEGER,

                             input_method VARCHAR(20) NOT NULL,

                             starts_on DATE NOT NULL,

                             ends_on DATE,

                             is_active BOOLEAN NOT NULL DEFAULT TRUE,

                             generated_until DATE,

                             last_generated_at TIMESTAMPTZ,

                             timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',

                             created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             CONSTRAINT task_series_member_fk
                                 FOREIGN KEY (member_id)
                                     REFERENCES members(id)
                                     ON DELETE CASCADE,

                             CONSTRAINT task_series_recurrence_type_check
                                 CHECK (recurrence_type IN (
                                                            'daily',
                                                            'weekdays',
                                                            'weekly'
                                     )),

                             CONSTRAINT task_series_reminder_minutes_check
                                 CHECK (
                                     reminder_minutes IS NULL
                                         OR reminder_minutes IN (
                                                                 10,
                                                                 20,
                                                                 30,
                                                                 60,
                                                                 120
                                         )
                                     ),

                             CONSTRAINT task_series_input_method_check
                                 CHECK (input_method IN (
                                                         'voice',
                                                         'text'
                                     )),

                             CONSTRAINT task_series_date_check
                                 CHECK (
                                     ends_on IS NULL
                                         OR ends_on >= starts_on
                                     )
);


CREATE INDEX idx_task_series_member_active
    ON task_series(member_id, is_active);


-- =========================================================
-- 10. TASKS
-- =========================================================

CREATE TABLE tasks (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                       member_id UUID NOT NULL,

                       series_id UUID,

                       source_task_id UUID,

                       client_request_id UUID,

                       title TEXT NOT NULL,

                       memo TEXT,

                       scheduled_at TIMESTAMPTZ NOT NULL,

                       reminder_minutes INTEGER,

                       status VARCHAR(20) NOT NULL DEFAULT 'pending',

                       input_method VARCHAR(20) NOT NULL,

                       completed_at TIMESTAMPTZ,

                       failed_at TIMESTAMPTZ,

                       status_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT tasks_member_fk
                           FOREIGN KEY (member_id)
                               REFERENCES members(id)
                               ON DELETE CASCADE,

                       CONSTRAINT tasks_series_fk
                           FOREIGN KEY (series_id)
                               REFERENCES task_series(id)
                               ON DELETE SET NULL,

                       CONSTRAINT tasks_source_task_fk
                           FOREIGN KEY (source_task_id)
                               REFERENCES tasks(id)
                               ON DELETE SET NULL,

                       CONSTRAINT tasks_reminder_minutes_check
                           CHECK (
                               reminder_minutes IS NULL
                                   OR reminder_minutes IN (
                                                           10,
                                                           20,
                                                           30,
                                                           60,
                                                           120
                                   )
                               ),

                       CONSTRAINT tasks_status_check
                           CHECK (status IN (
                                             'pending',
                                             'completed',
                                             'failed'
                               )),

                       CONSTRAINT tasks_input_method_check
                           CHECK (input_method IN (
                                                   'voice',
                                                   'text'
                               ))
);


CREATE INDEX idx_tasks_member_scheduled_at
    ON tasks(member_id, scheduled_at);


CREATE INDEX idx_tasks_series_id
    ON tasks(series_id);


CREATE UNIQUE INDEX uq_tasks_member_client_request
    ON tasks(member_id, client_request_id)
    WHERE client_request_id IS NOT NULL;


-- =========================================================
-- 11. TASK LOCAL NOTIFICATIONS
--
-- 로그인 회원 일정의 기기 로컬 알림 예약 상태
--
-- 비회원 알림은 서버에 저장하지 않는다.
-- =========================================================

CREATE TABLE task_local_notifications (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                          task_id UUID NOT NULL,

                                          member_id UUID NOT NULL,

                                          device_id UUID NOT NULL,

                                          local_notification_id TEXT,

                                          scheduled_for TIMESTAMPTZ,

                                          reservation_status VARCHAR(30) NOT NULL DEFAULT 'pending',

                                          retry_count INTEGER NOT NULL DEFAULT 0,

                                          last_error TEXT,

                                          reserved_at TIMESTAMPTZ,

                                          cancelled_at TIMESTAMPTZ,

                                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                          CONSTRAINT task_local_notifications_task_fk
                                              FOREIGN KEY (task_id)
                                                  REFERENCES tasks(id)
                                                  ON DELETE CASCADE,

                                          CONSTRAINT task_local_notifications_member_fk
                                              FOREIGN KEY (member_id)
                                                  REFERENCES members(id)
                                                  ON DELETE CASCADE,

                                          CONSTRAINT task_local_notifications_device_fk
                                              FOREIGN KEY (device_id)
                                                  REFERENCES app_devices(id),

                                          CONSTRAINT task_local_notifications_status_check
                                              CHECK (reservation_status IN (
                                                                            'pending',
                                                                            'scheduled',
                                                                            'permission_denied',
                                                                            'failed',
                                                                            'cancelled'
                                                  )),

                                          CONSTRAINT task_local_notifications_retry_count_check
                                              CHECK (
                                                  retry_count BETWEEN 0 AND 3
                                                  )
);


CREATE INDEX idx_task_local_notifications_task_id
    ON task_local_notifications(task_id);


CREATE INDEX idx_task_local_notifications_member_id
    ON task_local_notifications(member_id);


CREATE INDEX idx_task_local_notifications_device_id
    ON task_local_notifications(device_id);


-- =========================================================
-- 12. ABUSE PREVENTION HISTORY
--
-- 회원 탈퇴 이후에도 무료 체험/프로모션 악용 방지를 위해
-- 최소한의 비식별 식별값을 일정 기간 보관한다.
--
-- member FK를 두지 않는다.
-- 회원 삭제 이후에도 유지되어야 하기 때문이다.
-- =========================================================

CREATE TABLE abuse_prevention_history (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                          identity_hash TEXT NOT NULL UNIQUE,

                                          trial_used BOOLEAN NOT NULL DEFAULT FALSE,

                                          first_trial_started_at TIMESTAMPTZ,

                                          last_trial_ended_at TIMESTAMPTZ,

                                          first_joined_at TIMESTAMPTZ,

                                          last_withdrawn_at TIMESTAMPTZ,

                                          rejoin_count INTEGER NOT NULL DEFAULT 0,

                                          retention_expires_at TIMESTAMPTZ,

                                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                          CONSTRAINT abuse_prevention_history_rejoin_count_check
                                              CHECK (rejoin_count >= 0)
);