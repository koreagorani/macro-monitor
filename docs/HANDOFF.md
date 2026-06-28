# Handoff

## 현재 단계

Phase 1 완료.
Phase 2 완료.
Phase 3 데이터 자동 수집 준비 시작.

## 완료된 내용

### Phase 1 수동 보고서 검증

- 수동 보고서 구조 검토 완료
- 5분 이내 핵심 판단이 가능하도록 출력 범위 정리
- 주간 보고서 취약 테마 출력을 상위 3개로 제한
- 헷지 필요성 판정 후 조건부로 0~2개 테마만 제안하도록 명세 수정
- 관련 결정사항을 `docs/DECISIONS.md`에 반영

### Phase 2 GitHub 하네스 구성

- 문서 구조 생성
- `AGENTS.md` 라우팅 구성
- 아키텍처 문서 작성
- 로드맵 작성
- README 작성
- `config/` 폴더 생성
- 설정 파일 초안 생성
- 새 세션이 작업 유형에 필요한 문서만 읽고 시작할 수 있는 구조 확보

## 현재 작업

Phase 3 데이터 자동 수집 준비:

- MVP 지표 6개 데이터 소스 확정
- `config/indicators.json` 작성
- 데이터 출력 스키마 정의
- JavaScript와 TypeScript 중 구현 언어 결정
- 수동 실행 가능한 수집 스크립트 구조 설계

Phase 3 완료 조건:

- MVP 지표 6개의 최신값, 전주값, 4주값을 수집한다.
- 수집 결과를 정규화된 데이터 파일로 생성한다.
- 브라우저 또는 GitHub Actions에서 수동 실행할 수 있다.

## 다음 세션이 읽을 문서

필수:
- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `config/indicators.json`
- `docs/HANDOFF.md`

선택:
- 지표 판정에 필요한 필드를 확인할 때 `docs/RISK_MODEL.md`
- 구조적 결정이 필요한 경우 `docs/DECISIONS.md`

## 미해결

- MVP 지표별 실제 데이터 소스
- JavaScript와 TypeScript 중 선택
- 데이터 API 키 필요 여부
- 정기발표형 지표와 시장가격형 지표의 공통 출력 형식
- 정규화 방식
