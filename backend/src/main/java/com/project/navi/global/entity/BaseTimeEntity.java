package com.project.navi.global.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
/**
 * 모든 엔티티의 공통 필드 + 수명주기 콜백으로 타임스탬프 관리
 * createdAt : 최초 INSERT 시 한 번만 세팅
 * updatedAt : INSERT · UPDATE 마다 변경
 * 인스턴스 : UTC 기준의 특정 시점(timestamp) 을 표현
 */
@Getter
@Setter
@MappedSuperclass
public abstract class BaseTimeEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** INSERT 직전에 호출 */
    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    /** UPDATE 직전에 호출 */
    @PreUpdate
    protected void onUpdate() { updatedAt = Instant.now();  }

}
