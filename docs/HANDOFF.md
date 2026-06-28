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
- `docs/REQUIREMENTS.md`의 보고서 항목을 `docs/REPORT_SPEC.md`와 일치하도록 정리
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

### Phase 3 데이터 수집 설계

- 근원 PCE를 월간 발표형 지표로 분류
- 근원 PCE의 기본 비교 기준을 이전 발표치와 3개월 추세로 확정
- 원시 시계열은 실행 중 메모리 또는 임시 파일에서만 처리하고 계산 후 폐기하도록 결정
- 비트코인과 S&P 500의 전체 원시 시계열을 공개 저장소에 장기 보관하지 않도록 결정
- 최종 보고서는 저장소에 커밋하지 않고 개인 Notion 데이터베이스로 전송하도록 결정
- GitHub Actions 로그와 오류 로그에 원시 API 응답 전체를 출력하지 않도록 결정
- 보고서에 각 지표의 원출처와 기준일을 표시하도록 요구사항 추가
- 관련 구조를 `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`에 반영

## 현재 작업

Phase 3 데이터 자동 수집 준비:

- MVP 지표 6개 데이터 소스 확정
- `config/indicators.json` 작성
- 데이터 출력 스키마 정의
- JavaScript와 TypeScript 중 구현 언어 결정
- 수동 실행 가능한 수집 스크립트 구조 설계

Phase 3 완료 조건:

- 시장가격형 지표는 기준일 현재값, 전주 대비 변화율, 4주 누적 변화율을 계산한다.
- 근원 PCE는 이전 발표치와 3개월 추세를 계산한다.
- 수집 결과를 정규화된 데이터 구조로 생성한다.
- 원시 시계열은 계산 후 폐기하며 저장소에 커밋하지 않는다.
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
