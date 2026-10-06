-- 1. members.status
ALTER TABLE members
DROP CONSTRAINT members_status_check;

UPDATE members
SET status = UPPER(status);

ALTER TABLE members
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE members
    ADD CONSTRAINT members_status_check
        CHECK (status IN ('ACTIVE', 'WITHDRAWN', 'SUSPENDED'));


-- 2. auth_identities.provider
ALTER TABLE auth_identities
DROP CONSTRAINT auth_identities_provider_check;

ALTER TABLE auth_identities
DROP CONSTRAINT auth_identities_provider_data_check;

UPDATE auth_identities
SET provider = UPPER(provider);

ALTER TABLE auth_identities
    ADD CONSTRAINT auth_identities_provider_check
        CHECK (provider IN ('LOCAL'));

ALTER TABLE auth_identities
    ADD CONSTRAINT auth_identities_provider_data_check
        CHECK (
            provider = 'LOCAL'
                AND password_hash IS NOT NULL
            );


-- 3. app_devices.platform
ALTER TABLE app_devices
DROP CONSTRAINT app_devices_platform_check;

UPDATE app_devices
SET platform = UPPER(platform);

ALTER TABLE app_devices
    ADD CONSTRAINT app_devices_platform_check
        CHECK (platform IN ('IOS', 'ANDROID'));


-- 4. auth_sessions.status / revoked_reason
-- 기존 인덱스는 status = 'active'를 조건으로 사용하므로 함께 변경한다.
DROP INDEX uq_auth_sessions_active_member;

ALTER TABLE auth_sessions
DROP CONSTRAINT auth_sessions_status_check;

ALTER TABLE auth_sessions
DROP CONSTRAINT auth_sessions_revoked_reason_check;

UPDATE auth_sessions
SET status = UPPER(status),
    revoked_reason = UPPER(revoked_reason);

ALTER TABLE auth_sessions
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_status_check
        CHECK (
            status IN (
                       'ACTIVE',
                       'REVOKED',
                       'LOGGED_OUT',
                       'EXPIRED'
                )
            );

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_revoked_reason_check
        CHECK (
            revoked_reason IS NULL
                OR revoked_reason IN (
                                      'REPLACED_BY_NEW_LOGIN',
                                      'USER_LOGOUT',
                                      'WITHDRAWAL',
                                      'EXPIRED',
                                      'ADMIN'
                )
            );

CREATE UNIQUE INDEX uq_auth_sessions_active_member
    ON auth_sessions(member_id)
    WHERE status = 'ACTIVE';


-- 5. user_access.access_type / status
ALTER TABLE user_access
DROP CONSTRAINT user_access_type_check;

ALTER TABLE user_access
DROP CONSTRAINT user_access_status_check;

UPDATE user_access
SET access_type = UPPER(access_type),
    status = UPPER(status);

ALTER TABLE user_access
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE user_access
    ADD CONSTRAINT user_access_type_check
        CHECK (
            access_type IN (
                            'TRIAL',
                            'SUBSCRIPTION',
                            'USAGE_PACK',
                            'FREE'
                )
            );

ALTER TABLE user_access
    ADD CONSTRAINT user_access_status_check
        CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'));


-- 6. task_series.recurrence_type / input_method
ALTER TABLE task_series
DROP CONSTRAINT task_series_recurrence_type_check;

ALTER TABLE task_series
DROP CONSTRAINT task_series_input_method_check;

UPDATE task_series
SET recurrence_type = UPPER(recurrence_type),
    input_method = UPPER(input_method);

ALTER TABLE task_series
    ADD CONSTRAINT task_series_recurrence_type_check
        CHECK (
            recurrence_type IN (
                                'DAILY',
                                'WEEKDAYS',
                                'WEEKLY'
                )
            );

ALTER TABLE task_series
    ADD CONSTRAINT task_series_input_method_check
        CHECK (input_method IN ('VOICE', 'TEXT'));


-- 7. tasks.status / input_method
ALTER TABLE tasks
DROP CONSTRAINT tasks_status_check;

ALTER TABLE tasks
DROP CONSTRAINT tasks_input_method_check;

UPDATE tasks
SET status = UPPER(status),
    input_method = UPPER(input_method);

ALTER TABLE tasks
    ALTER COLUMN status SET DEFAULT 'PENDING';

ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'));

ALTER TABLE tasks
    ADD CONSTRAINT tasks_input_method_check
        CHECK (input_method IN ('VOICE', 'TEXT'));


-- 8. task_local_notifications.reservation_status
ALTER TABLE task_local_notifications
DROP CONSTRAINT task_local_notifications_status_check;

UPDATE task_local_notifications
SET reservation_status = UPPER(reservation_status);

ALTER TABLE task_local_notifications
    ALTER COLUMN reservation_status SET DEFAULT 'PENDING';

ALTER TABLE task_local_notifications
    ADD CONSTRAINT task_local_notifications_status_check
        CHECK (
            reservation_status IN (
                                   'PENDING',
                                   'SCHEDULED',
                                   'PERMISSION_DENIED',
                                   'FAILED',
                                   'CANCELLED'
                )
            );