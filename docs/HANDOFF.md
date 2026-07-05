# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 MVP 완료
- Phase 4 위험 모델 첫 수직 슬라이스 구현 및 검증 완료

## 완료된 내용

### Phase 1 수동 보고서 검증

- 실제 데이터로 수동 보고서 3회 작성
- 5분 이내 핵심 판단 가능 여부 확인
- 취약 테마 출력 수와 헷지 제안 규칙 정리

### Phase 2 GitHub 하네스 구성

- 문서 구조와 `AGENTS.md` 라우팅 구성
- README와 config 설정 파일 초안 생성
- 새 세션이 작업 유형에 필요한 문서만 읽고 시작할 수 있는 구조 확보

### Phase 3 데이터 수집 MVP

- MVP 지표 6개를 FRED API 기반으로 설정
- 정규화 출력 계약과 JSON Schema 작성
- 시장가격형 5개 수집·계산·검증 완료
- 근원 PCE 수집·전월비 계산·검증 완료
- MVP 6개 통합 수집 워크플로 실제 성공 확인
  - run: `28704090587`
  - job: `collect-all-indicators`
  - strict 모드 통과

### Phase 4 준비 결정 및 설정 기반

- 핵심 지표 범위 결정 완료
  - 핵심: `us2y`, `core_pce`, `wti`, `usdkrw`, `sp500`
  - 비핵심: `btc`
- 핵심 지표 2개 이상 실패 시 중단 판단은 데이터 수집기 내부가 아니라 수집 완료 후 위험점수 계산 전 품질 게이트에서 수행하기로 결정
- `package-lock.json` 생성 및 커밋 완료
- `config/thresholds.json` 작성 완료
- `config/risk-areas.json` 작성 완료

### Phase 4 첫 수직 슬라이스

- `data/schema/risk-output.schema.json` 추가
  - `schemaVersion`, `asOf`, `quality`, `indicatorStatuses`, `areaRisks`, `overallRisk`, `warnings` 포함
  - 이번 단계에서 `areaRisks`는 빈 배열, `overallRisk`는 `null` 허용
- `src/risk/quality-gate.js` 구현
  - `risk-areas.json`의 `coreIndicators`, `nonCoreIndicators`, `qualityGate` 설정 사용
  - 핵심 지표 2개 이상 실패 시 `shouldAbort: true`
  - 핵심 지표 1개 실패 시 `confidence: reduced`
  - 비핵심 지표 실패 시 중단하지 않고 warning 생성
- `src/risk/evaluate-indicator.js` 구현
  - `thresholds.json`의 활성 규칙 기준으로 지표별 `status`, `score` 계산
  - `available: false` 지표는 `unavailable`로 반환하고 threshold 평가 제외
  - `disabledMetrics`와 `futureMetrics`는 계산에서 제외
  - 여러 규칙이 매칭되면 가장 높은 `score`를 선택
  - `easing`의 음수 점수는 그대로 보존
- `scripts/run-risk-model.js` 추가
  - 내부에서 MVP 6개 수집 함수 재사용
  - 품질 게이트 실행
  - `shouldAbort: true`이면 `indicatorStatuses`는 빈 배열로 출력
  - `shouldAbort: false`이면 `indicatorStatuses`까지 계산해 출력
  - `areaRisks`는 빈 배열, `overallRisk`는 `null` 유지
- `src/validation/validate-risk-output.js` 추가
- `test/risk-model.test.js` 추가
  - 핵심 지표 2개 실패
  - 핵심 지표 1개 실패
  - `btc`만 실패
  - unavailable 지표 처리
  - disabled/future rule 무시
  - 가장 높은 score rule 선택
  - risk-output schema 검증
- `package.json`에 `evaluate:risk` 명령 추가
- `Manual Risk Model Evaluation` workflow 추가
- 기존 수집 workflow의 의존성 설치를 `npm ci --no-audit --no-fund`로 변경
- `Manual Risk Model Evaluation` 실제 실행 성공 확인
  - run: `28736780393`
  - job: `evaluate-risk-model`
  - `npm ci`, `npm test`, `npm run validate:examples`, 실제 FRED 수집 기반 risk-output 생성 모두 성공

## 현재 실행 방법

GitHub Actions:
- 위험 모델 첫 수직 슬라이스 검증: Actions → `Manual Risk Model Evaluation`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- Lockfile 생성: Actions → `Generate Package Lock`
- 선택적으로 `as_of`를 `YYYY-MM-DD`로 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run evaluate:risk -- YYYY-MM-DD`
- `npm run collect:all -- YYYY-MM-DD`
- `npm run collect:market-prices -- YYYY-MM-DD`
- `npm run collect:core-pce -- YYYY-MM-DD`
- `npm run collect:us2y -- YYYY-MM-DD`

## 검증 결과

확인 완료:
- 미국 2년물 실제 GitHub Actions 성공
- 시장가격형 5개 실제 GitHub Actions 성공
- 근원 PCE 실제 GitHub Actions 성공
- MVP 6개 통합 실제 GitHub Actions 성공
- strict 모드 통과로 6개 지표 모두 `available: true`로 간주
- 모든 결과가 JSON Schema 검증을 통과한 것으로 간주
- `thresholds.json`과 `risk-areas.json` JSON 구조 작성 및 재조회 확인
- lockfile artifact workflow 성공 확인
- artifact 기반 `package-lock.json` 커밋 완료
- `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- 새 risk model 단위 테스트 통과
- 실제 FRED 수집 결과 기반 risk-output schema 통과

## Phase 4 설계 방향

- `docs/RISK_MODEL.md`는 위험모델의 설명 기준과 초기 휴리스틱의 단일 출처로 둔다.
- `config/thresholds.json`에는 코드가 읽을 지표별 임계값과 상태 점수 규칙을 둔다.
- `config/risk-areas.json`에는 영역 정의, 영역 가중치, 지표와 영역의 연결 관계를 둔다.
- 위험점수 코드는 수집 결과를 직접 재계산하지 않고 정규화 출력의 `metrics`만 사용한다.
- 데이터 품질 게이트는 위험점수 계산 전 단계에 둔다.

## 다음 작업 후보

1. 영역별 위험 점수 계산 구현
2. 전체 위험 단계 판정 구현
3. 위험 모델 출력 예시 파일 추가
4. 이후 포트폴리오 취약도 계산 단계로 연결

## 다음 세션이 읽을 문서

Phase 4 위험 모델 구현 시 필수:
- `AGENTS.md`
- `docs/RISK_MODEL.md`
- `docs/ARCHITECTURE.md`
- `config/thresholds.json`
- `config/risk-areas.json`
- `docs/HANDOFF.md`

선택:
- 입력 데이터 형식 확인 시 `docs/REQUIREMENTS.md`
- 구조적 결정 확인 시 `docs/DECISIONS.md`

## 미해결

- 영역별 위험 점수 계산 구현
- 전체 위험 단계 판정 구현
