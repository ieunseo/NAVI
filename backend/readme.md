### 데이터베이스
migration/
→ 테이블
→ 컬럼
→ FK
→ Index
→ Constraint
→ 스키마 자체의 변경사항

seed/local/
→ 로컬 테스트용 사용자/일정 등

seed/dev/
→ 개발 서버에서 필요한 테스트 데이터

운영환경
→ Seed 없음
-------
V0__init.sql       ← 최초 DB

V1__add_xxx.sql    ← 이후 변경

V2__alter_xxx.sql

V3__add_index.sql