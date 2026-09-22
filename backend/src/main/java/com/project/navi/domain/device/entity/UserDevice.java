package com.project.navi.domain.device.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_devices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(
            name = "installation_id",
            nullable = false,
            unique = true,
            columnDefinition = "text")
    /* app 이 설치될때 생성해서 유지하는 식별값*/
    private String installationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(name = "device_name", columnDefinition = "text")
    private String deviceName;

    @Column(name = "app_version", columnDefinition = "text")
    private String appVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    public static UserDevice create(
            String installationId,
            DevicePlatform platform,
            String deviceName,
            String appVersion
    ) {
        UserDevice device = new UserDevice();
        device.installationId = installationId;
        device.platform = platform;
        device.deviceName = deviceName;
        device.appVersion = appVersion;

        Instant now = Instant.now();
        device.createdAt = now;
        device.lastSeenAt = now;

        return device;
    }

    public void updateLastSeen() {
        this.lastSeenAt = Instant.now();
    }
}