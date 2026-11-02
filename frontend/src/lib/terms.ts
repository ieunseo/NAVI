import { apiRequest } from "./api";

/*
 * 백엔드 TermResponse 와 동일
 */
export type Term = {
    id: string;
    code: string;
    version: string;
    title: string;
    required: boolean;
    documentUrl: string | null;
    effectiveAt: string;
};

/*
 * 현재 적용 중인 필수 약관 목록
 * (회원가입 시 이 약관들의 id 를 모두 agreedTermIds 로 보내야 합니다.)
 */
export async function fetchRequiredTerms() {
    return apiRequest<Term[]>("/api/terms/required");
}
