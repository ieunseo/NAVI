package com.project.navi.domain.device.service;

import com.project.navi.domain.device.dto.DeviceRegisterRequest;
import com.project.navi.domain.device.entity.UserDevice;
import com.project.navi.domain.device.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;

    /* 로그인시 기존기기를 찾고, 없으면 새로 등록 */
    @Transactional
    public UserDevice registerOrUpdate(DeviceRegisterRequest request) {
        return deviceRepository.findByInstallationId(request.installationId())
                .map(device -> {
                    device.updateInfo(request.deviceName(), request.appVersion());
                    return device;
                })
                .orElseGet(() -> deviceRepository.save(UserDevice.create(
                        request.installationId(),
                        request.platform(),
                        request.deviceName(),
                        request.appVersion())));
    }
}
