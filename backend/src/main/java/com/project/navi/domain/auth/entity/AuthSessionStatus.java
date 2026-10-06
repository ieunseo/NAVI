package com.project.navi.domain.auth.entity;

public enum AuthSessionStatus {
    ACTIVE,//현재 사용가능한 로그인
    REVOKED,//무효
    LOGGED_OUT,//로그아웃
    EXPIRED //유효기간 만료
}