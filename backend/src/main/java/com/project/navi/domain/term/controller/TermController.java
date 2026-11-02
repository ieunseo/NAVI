package com.project.navi.domain.term.controller;

import com.project.navi.domain.term.dto.TermResponse;
import com.project.navi.domain.term.service.TermService;
import com.project.navi.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/terms")
@RequiredArgsConstructor
public class TermController {

    private final TermService termService;

    @GetMapping("/required")
    public ApiResponse<List<TermResponse>> getCurrentRequiredTerms() {
        return ApiResponse.ok(termService.getCurrentRequiredTerms());
    }
}
