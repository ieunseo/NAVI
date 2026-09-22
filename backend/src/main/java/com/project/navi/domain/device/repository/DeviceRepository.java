package com.project.navi.domain.device.repository;

import com.project.navi.domain.device.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DeviceRepository extends JpaRepository<UserDevice, UUID> {

    /* 로그인시 기존기기를 찾고, 없으면 새로 등록.*/
    Optional<UserDevice> findByInstallationId(String installationId);
}