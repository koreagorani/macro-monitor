# AGENTS.md

## 목적

이 파일은 작업 유형에 따라 필요한 문서만 읽도록 안내하는 라우터다.
모든 작업에서 모든 문서를 읽지 않는다.

## 공통 원칙

1. 현재 작업과 직접 관련된 문서만 읽는다.
2. 문서 간 충돌이 있으면 `docs/DECISIONS.md`를 우선 확인한다.
3. 작업 중 새로운 구조적 결정을 내렸다면 `docs/DECISIONS.md`를 갱신한다.
4. 작업이 끝나면 `docs/HANDOFF.md`를 갱신한다.
5. 요구사항을 바꾸지 않고 구현만 하는 작업에서는 설계 문서를 재해석하지 않는다.
6. 비밀키는 코드나 문서에 기록하지 않는다.
7. 같은 규칙을 여러 문서에 완전한 형태로 중복 작성하지 않는다. 상세 규칙은 담당 문서 한 곳에 두고 다른 문서에서는 요약하거나 링크한다.

## 문서 역할과 단일 출처

- `docs/PROJECT_CONTEXT.md`: 프로젝트 목적, 사용자 환경, 장기 방향
- `docs/REQUIREMENTS.md`: 시스템이 반드시 충족해야 하는 기능 및 비기능 요구사항
- `docs/ARCHITECTURE.md`: 시스템 구조, 데이터 흐름, 처리·보관·로그 구현 원칙
- `docs/DECISIONS.md`: 구조적 결정과 그 이유. 세부 운영 규칙은 담당 문서를 참조한다.
- `docs/REPORT_SPEC.md`: 보고서의 세부 출력 형식과 표현 규칙
- `docs/RISK_MODEL.md`: 위험 판정 규칙과 초기 임계값
- `docs/PORTFOLIO.md`: 포트폴리오 취약도 입력·출력 계약과 테마 민감도 모델
- `docs/ROADMAP.md`: 단계별 범위와 완료 조건
- `docs/HANDOFF.md`: 현재 상태, 최근 완료 작업, 미해결 문제, 다음 작업
- `README.md`: 프로젝트의 간결한 개요와 주요 문서 안내
- `config/`: 코드가 읽는 실행 설정과 임계값

같은 주제가 여러 문서에 나타날 때는 위 담당 문서를 단일 출처로 사용한다.
요구사항에는 구현 수단을 과도하게 넣지 않고, 아키텍처에는 제품 요구사항을 재정의하지 않는다.
`HANDOFF.md`에는 영구 규칙의 전문을 복사하지 않고 변경 사실과 현재 상태만 기록한다.

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
- `docs/PORTFOLIO.md`
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
- `docs/PORTFOLIO.md`
- `config/portfolio-themes.json`
- `config/hedge-candidates.json`
- `docs/HANDOFF.md`

선택:
- 영역 점수 형식 확인 시 `docs/RISK_MODEL.md`
- risk-output 입력 계약 확인 시 `data/schema/risk-output.schema.json`

### AI 분석 프롬프트 작업

읽을 문서:
- `docs/REPORT_SPEC.md`
- `docs/RISK_MODEL.md`
- `docs/PORTFOLIO.md`
- `prompts/weekly-analysis.md`
- `docs/HANDOFF.md`

선택:
- 전체 목적 확인이 필요할 때만 `docs/PROJECT_CONTEXT.md`

### 주간 보고서 생성

읽을 문서:
- `docs/REPORT_SPEC.md`
- `docs/RISK_MODEL.md`
- `docs/PORTFOLIO.md`
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
3. `docs/HANDOFF.md`에서 현재 상태와 미해결 문제를 확인한다.
4. 작업 범위를 벗어나는 변경은 하지 않는다.

## 작업 종료 절차

1. 수정한 파일을 기록한다.
2. 검증 결과를 기록한다.
3. 미해결 문제를 기록한다.
4. 다음 작업자가 읽어야 할 문서를 지정한다.
5. 구조적 결정이 추가됐다면 `docs/DECISIONS.md`를 갱신한다.
