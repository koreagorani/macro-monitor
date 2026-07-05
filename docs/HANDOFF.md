# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 MVP 완료
- Phase 4 위험 모델 핵심 구현 및 검증 완료
- 다음 단계: Phase 5 포트폴리오 취약도 모델 진입 전 정리

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
- `src/risk/quality-gate.js` 구현
- `src/risk/evaluate-indicator.js` 구현
- `scripts/run-risk-model.js` 추가
- `src/validation/validate-risk-output.js` 추가
- `test/risk-model.test.js` 추가
- `package.json`에 `evaluate:risk` 명령 추가
- `Manual Risk Model Evaluation` workflow 추가
- 기존 수집 workflow의 의존성 설치를 `npm ci --no-audit --no-fund`로 변경
- `Manual Risk Model Evaluation` 실제 실행 성공 확인
  - run: `28736780393`
  - job: `evaluate-risk-model`
  - `npm ci`, `npm test`, `npm run validate:examples`, 실제 FRED 수집 기반 risk-output 생성 모두 성공

### Phase 4 영역별 위험 점수 계산

- `src/risk/aggregate-areas.js` 구현
- `data/schema/risk-output.schema.json` 보강
- `scripts/run-risk-model.js`에 `aggregateAreaRisks` 연결
- `test/area-aggregation.test.js` 추가
- `Manual Risk Model Evaluation` 재실행 성공 확인
  - run: `28736992100`
  - job: `evaluate-risk-model`
  - `npm ci`, `npm test`, `npm run validate:examples`, 실제 FRED 수집 기반 populated `areaRisks` 포함 risk-output 생성 모두 성공

### Phase 4 전체 위험 단계 판정

- `src/risk/evaluate-overall-risk.js` 구현
  - `areaRisks`와 `quality`를 입력으로 전체 위험 단계 판정
  - `RISK_MODEL.md`의 전체 위험 단계 규칙을 discrete rule로 우선 적용
  - weighted score는 보조 점수로 계산
  - `quality.shouldAbort === true`이면 `overallRisk`는 `null` 반환
- discrete rule 우선순위 구현
  - `high_risk`: `rates_policy`, `inflation_supply`, `risk_appetite`가 모두 watch 이상
  - `alert`: 서로 다른 두 영역이 alert 이상
  - `alert`: `rates_policy`와 `risk_appetite`가 동시에 watch 이상
  - `watch`: 한 영역이 alert 이상
  - `watch`: 두 영역 이상이 watch 이상
  - `normal`: 경계 영역 없음 + 주의 영역 1개 이하
- `overallRisk` 출력 구조 구현
  - `level`: `normal`, `watch`, `alert`, `high_risk`
  - `score`: 영역 weight 기반 전체 가중 점수
  - `label`: 한국어 단계 이름
  - `reasons`: 핵심 이유 배열
  - `triggeredRules`: 적용 규칙 ID 배열
  - `confidence`: quality gate 결과 반영
- `data/schema/risk-output.schema.json` 보강
  - `overallRisk` 객체 구조 검증 추가
  - 단, abort 상태에서는 `overallRisk: null` 허용
- `scripts/run-risk-model.js` 연결
  - `quality` → `indicatorStatuses` → `areaRisks` → `overallRisk` 순서로 출력
- `test/overall-risk.test.js` 추가
  - normal 판정
  - watch 판정
  - alert 판정
  - high_risk 판정
  - 금리와 위험선호 동시 악화 규칙
  - quality reduced의 confidence 반영
  - shouldAbort true 시 overallRisk 계산 생략
  - risk-output schema 검증
- `Manual Risk Model Evaluation` 첫 재실행 실패 확인
  - run: `28737163280`
  - job: `evaluate-risk-model`
  - `npm ci` 성공
  - `npm test` 실패
  - 이후 단계 skipped
- 실패 수정
  - weighted score 계산 결과를 12자리 정밀도로 안정화
  - 부동소수점 표현 오차로 테스트가 실패하지 않도록 `calculateWeightedScore` 반환값을 정규화
  - 수정 커밋: `1c5b339e6792d7b4d9097041abbdeb092d0300ea`
- 수정 후 `Manual Risk Model Evaluation` 재실행 성공 확인
  - run: `28737269543`
  - job: `evaluate-risk-model`
  - `npm ci`, `npm test`, `npm run validate:examples`, 실제 FRED 수집 기반 populated `overallRisk` 포함 risk-output 생성 모두 성공

## 현재 실행 방법

GitHub Actions:
- 위험 모델 검증: Actions → `Manual Risk Model Evaluation`
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
- lockfile artifact workflow 성공 확인
- artifact 기반 `package-lock.json` 커밋 완료
- `Manual Risk Model Evaluation` 첫 수직 슬라이스 실제 GitHub Actions 성공
- area risk aggregation 추가 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- overallRisk 추가 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- `test/risk-model.test.js`, `test/area-aggregation.test.js`, `test/overall-risk.test.js` 통과
- 실제 FRED 수집 결과 기반 populated `overallRisk` 포함 risk-output schema 통과

## Phase 4 설계 방향

- `docs/RISK_MODEL.md`는 위험모델의 설명 기준과 초기 휴리스틱의 단일 출처로 둔다.
- `config/thresholds.json`에는 코드가 읽을 지표별 임계값과 상태 점수 규칙을 둔다.
- `config/risk-areas.json`에는 영역 정의, 영역 가중치, 지표와 영역의 연결 관계를 둔다.
- 위험점수 코드는 수집 결과를 직접 재계산하지 않고 정규화 출력의 `metrics`만 사용한다.
- 데이터 품질 게이트는 위험점수 계산 전 단계에 둔다.
- 전체 위험 단계 판정은 discrete rule을 우선하고 weighted score는 보조 지표로 사용한다.

## 다음 작업 후보

1. 위험 모델 출력 예시 파일 추가
2. Phase 5 포트폴리오 취약도 모델 진입 전 문서 정리
3. 이후 포트폴리오 취약도 계산 단계로 연결

## 다음 세션이 읽을 문서

Phase 4 마무리 및 Phase 5 준비 시 필수:
- `AGENTS.md`
- `docs/RISK_MODEL.md`
- `docs/ARCHITECTURE.md`
- `config/thresholds.json`
- `config/risk-areas.json`
- `docs/HANDOFF.md`

Phase 5 포트폴리오 취약도 모델 진입 시 추가 확인:
- `docs/PORTFOLIO.md`
- `config/portfolio-themes.json`
- `config/hedge-candidates.json`

선택:
- 입력 데이터 형식 확인 시 `docs/REQUIREMENTS.md`
- 구조적 결정 확인 시 `docs/DECISIONS.md`

## 미해결

- Phase 5 진입 전 위험 모델 출력 예시와 문서 정리
- Phase 5 포트폴리오 취약도 모델 구현
