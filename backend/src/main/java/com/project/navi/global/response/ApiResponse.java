package com.project.navi.global.response;

import com.project.navi.global.exception.ErrorCode;

/*
 * 모든 API 공통 응답
 * 성공 : { success: true,  data: {...}, error: null }
 * 실패 : { success: false, data: null,  error: { code, message } }
 */
public record ApiResponse<T>(
        boolean success,
        T data,
        ErrorBody error
) {

    public record ErrorBody(String code, String message) {
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null);
    }

    public static ApiResponse<Void> fail(ErrorCode errorCode) {
        return fail(errorCode, errorCode.getMessage());
    }

    public static ApiResponse<Void> fail(ErrorCode errorCode, String message) {
        return new ApiResponse<>(false, null, new ErrorBody(errorCode.name(), message));
    }
}
