# AGENTS.md

## 목적

이 파일은 작업 유형에 따라 필요한 문서만 읽도록 안내하는 라우터다.
모든 작업에서 모든 문서를 읽지 않는다.

## 공통 원칙

1. 현재 작업과 직접 관련된 문서만 읽는다.
2. 문서 간 충돌이 있으면 `DECISIONS.md`를 우선 확인한다.
3. 작업 중 새로운 구조적 결정을 내렸다면 `DECISIONS.md`를 갱신한다.
4. 작업이 끝나면 `HANDOFF.md`를 갱신한다.
5. 요구사항을 바꾸지 않고 구현만 하는 작업에서는 설계 문서를 재해석하지 않는다.
6. 비밀키는 코드나 문서에 기록하지 않는다.

## 작업 유형별 필수 문서

### 프로젝트 전체 구조 검토

읽을 문서:
- `docs/PROJECT_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

선택:
- 요구사항 변경이 포함되면 `docs/REQUIREMENTS.md`

### 데이터 수집 구현

읽을 문서:
- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `config/indicators.json`
- `docs/HANDOFF.md`

선택:
- 지표 판정에 필요한 필드 확인 시 `docs/RISK_MODEL.md`

읽지 않아도 되는 문서:
- `docs/PORTFOLIO_MODEL.md`
- `docs/REPORT_SPEC.md`

### 위험점수 계산 구현

읽을 문서:
- `docs/RISK_MODEL.md`
- `docs/ARCHITECTURE.md`
- `config/thresholds.json`
- `config/risk-areas.json`
- `docs/HANDOFF.md`

선택:
- 입력 데이터 형식 확인 시 `docs/REQUIREMENTS.md`

### 포트폴리오 취약도 구현

읽을 문서:
- `docs/PORTFOLIO_MODEL.md`
- `config/portfolio.json`
- `config/theme-exposures.json`
- `docs/HANDOFF.md`

선택:
- 영역 점수 형식 확인 시 `docs/RISK_MODEL.md`

### AI 분석 프롬프트 작업

읽을 문서:
- `docs/REPORT_SPEC.md`
- `docs/RISK_MODEL.md`
- `docs/PORTFOLIO_MODEL.md`
- `prompts/weekly-analysis.md`
- `docs/HANDOFF.md`

선택:
- 전체 목적 확인이 필요할 때만 `docs/PROJECT_CONTEXT.md`

### 주간 보고서 생성

읽을 문서:
- `docs/REPORT_SPEC.md`
- `docs/RISK_MODEL.md`
- `docs/PORTFOLIO_MODEL.md`
- `docs/HANDOFF.md`

읽지 않아도 되는 문서:
- `docs/ROADMAP.md`

### GitHub Actions 및 예약 실행

읽을 문서:
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/HANDOFF.md`

선택:
- 실행 결과 형식 확인 시 `docs/REPORT_SPEC.md`

### Notion 연동

읽을 문서:
- `docs/ARCHITECTURE.md`
- `docs/REPORT_SPEC.md`
- `docs/HANDOFF.md`

### Telegram 연동

읽을 문서:
- `docs/ARCHITECTURE.md`
- `docs/REQUIREMENTS.md`
- `docs/HANDOFF.md`

### 테스트 및 평가

읽을 문서:
- 관련 기능 문서 1개
- `evals/test-cases.md`
- `evals/expected-results.md`
- `docs/HANDOFF.md`

예:
- 위험모델 테스트 → `docs/RISK_MODEL.md`
- 보고서 테스트 → `docs/REPORT_SPEC.md`

## 작업 시작 절차

1. 작업 유형을 한 문장으로 정의한다.
2. 위 라우팅 표에서 필수 문서만 읽는다.
3. `HANDOFF.md`에서 현재 상태와 미해결 문제를 확인한다.
4. 작업 범위를 벗어나는 변경은 하지 않는다.

## 작업 종료 절차

1. 수정한 파일을 기록한다.
2. 검증 결과를 기록한다.
3. 미해결 문제를 기록한다.
4. 다음 작업자가 읽어야 할 문서를 지정한다.
5. 구조적 결정이 추가됐다면 `DECISIONS.md`를 갱신한다.
