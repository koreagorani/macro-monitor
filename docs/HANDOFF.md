# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 MVP 완료
- Phase 4 위험 모델 핵심 구현 및 검증 완료
- Phase 4 마무리 및 Phase 5 준비 검증 완료
- Phase 5 포트폴리오 취약도 모델 첫 구현 및 검증 완료
- Phase 5 live risk-output 통합 실행 경로 구현 및 검증 완료
- AI 주간 보고서 생성 설계 및 검증 완료
- 다음 단계: AI 보고서 생성 구현

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

### Phase 4 위험 모델

- 품질 게이트 구현 및 검증 완료
- 지표별 상태 판정 구현 및 검증 완료
- 영역별 위험 점수 계산 구현 및 검증 완료
- 전체 위험 단계 판정 구현 및 검증 완료
- `risk-output` schema 검증 완료
- `Manual Risk Model Evaluation` 실제 GitHub Actions 성공 확인
  - 첫 수직 슬라이스 run: `28736780393`
  - area aggregation run: `28736992100`
  - overallRisk run: `28737269543`
  - risk-output example 검증 run: `29086600175`
- 최종 확인된 Phase 4 출력:
  - `indicatorStatuses` populated
  - `areaRisks` populated
  - `overallRisk` populated
  - `risk-output` schema 통과

### Phase 5 포트폴리오 취약도 및 통합 실행 경로

- `data/schema/portfolio-vulnerability-output.schema.json` 추가
- `src/portfolio/evaluate-portfolio-vulnerability.js` 구현
- `scripts/run-portfolio-vulnerability.js` 추가
- `package.json`에 `evaluate:portfolio` 명령 추가
- `data/examples/portfolio-vulnerability.example.json` 추가
- `test/portfolio-vulnerability.test.js` 추가
- `.github/workflows/manual-portfolio-vulnerability.yml` 추가
- `Manual Portfolio Vulnerability Evaluation` 실제 실행 성공 확인
  - run: `29087059587`
  - job: `evaluate-portfolio-vulnerability`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:portfolio` 모두 성공
- `data/schema/macro-review-output.schema.json` 추가
- `src/review/build-macro-review-output.js` 구현
- `src/validation/validate-macro-review-output.js` 추가
- `scripts/run-macro-review.js` 추가
- `package.json`에 `evaluate:macro-review` 명령 추가
- `data/examples/macro-review.example.json` 추가
- `test/macro-review.test.js` 추가
- `.github/workflows/manual-macro-review.yml` 추가
- `Manual Macro Review Evaluation` 실제 실행 성공 확인
  - run: `29087571966`
  - job: `evaluate-macro-review`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:macro-review` 모두 성공

### AI 주간 보고서 생성 설계

- `data/schema/weekly-report-output.schema.json` 추가
  - AI 보고서 생성의 구조화 출력 계약
  - `sourceMacroReview`, `report`, `warnings` 구조 정의
  - 허용 행동 표현을 enum으로 제한
- `data/examples/weekly-report-output.example.json` 추가
  - 합성 weekly report output 예시
  - 실제 개인 보유 수량·평가금액 없음
- `scripts/validate-examples.js` 확장
  - weekly report output example을 schema로 검증
- `prompts/weekly-analysis.md` 보강
  - 입력은 `macroReviewOutput`
  - 출력은 `data/schema/weekly-report-output.schema.json`에 맞는 JSON만 허용
  - 숫자·등급·임계값 재계산 금지
  - 입력에 없는 최신 뉴스, 일정, 가격 생성 금지
  - 특정 종목 추천 금지
- `docs/REPORT_SPEC.md` 보강
  - AI 보고서 입력 계약은 `data/schema/macro-review-output.schema.json`
  - AI 보고서 출력 계약은 `data/schema/weekly-report-output.schema.json`
  - Markdown, Notion, Telegram 출력은 후속 렌더링 단계로 분리
- `test/weekly-report-output.test.js` 추가
  - weekly report example schema 검증
  - 필수 취약도 고지 포함 확인
  - 허용 action phrase 사용 확인
  - 금지 투자 표현 미포함 확인
  - 개인 보유 수량·평가금액 관련 key 미포함 확인
- `docs/DECISIONS.md` 갱신
  - D-024: AI 주간 보고서 출력 계약 확정

### AI 주간 보고서 검증 실패 수정

- `Manual Macro Review Evaluation` 재실행 실패 확인
  - run: `29088104445`
  - job: `evaluate-macro-review`
  - `npm ci` 성공
  - `npm test` 실패
  - 이후 `npm run validate:examples`, `npm run evaluate:macro-review` skipped
- 1차 실패 원인
  - `test/weekly-report-output.test.js`와 `scripts/validate-examples.js`가 `src/validation/validate-weekly-report-output.js`를 import했지만 해당 파일이 누락되어 있었다.
- 1차 수정 내용
  - `src/validation/validate-weekly-report-output.js` 추가
  - 기존 validator들과 동일한 Ajv2020 + ajv-formats 패턴으로 수정
- 1차 수정 커밋
  - 최초 validator 추가: `bd3d1e03ac1eac61f5e5012d7eafbe81236d5641`
  - 기존 Ajv 패턴 정렬: `7486835b65c16ad31d196a69a11a6f3cef149de5`
- `Manual Macro Review Evaluation` 재실행 실패 확인
  - run: `29088328224`
  - job: `evaluate-macro-review`
  - `npm ci` 성공
  - `npm test` 실패
  - 이후 `npm run validate:examples`, `npm run evaluate:macro-review` skipped
- 2차 실패 원인
  - `weekly-report-output.schema.json`의 `indicatorRow` 표시 필드가 `string | number | null` union type을 사용했다.
  - 기존 validator는 Ajv2020 strict 모드이므로 표시 필드는 strict schema에 맞춰 단순화해야 한다.
- 2차 수정 내용
  - `indicatorRow.currentValue`, `indicatorRow.weeklyChange`, `indicatorRow.secondaryMetric`을 `string | null`로 제한
  - AI 보고서 표의 수치 필드는 계산용 값이 아니라 사람이 읽는 표시 문자열로 취급
- 2차 수정 커밋
  - `cf9bcd13245c7b9eaa09358a3b33ea4f7540f717`
- 수정 후 `Manual Macro Review Evaluation` 재실행 성공 확인
  - run: `29088698198`
  - job: `evaluate-macro-review`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:macro-review` 모두 성공

## 현재 실행 방법

GitHub Actions:
- 통합 매크로 리뷰 검증: Actions → `Manual Macro Review Evaluation`
- 포트폴리오 취약도 검증: Actions → `Manual Portfolio Vulnerability Evaluation`
- 위험 모델 검증: Actions → `Manual Risk Model Evaluation`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- Lockfile 생성: Actions → `Generate Package Lock`
- 선택적으로 `as_of` 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run evaluate:macro-review -- YYYY-MM-DD`
- `npm run evaluate:risk -- YYYY-MM-DD`
- `npm run evaluate:portfolio -- data/examples/risk-output.example.json`
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
- risk-output example과 validate-examples 확장 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- Phase 5 포트폴리오 취약도 첫 구현 후 `Manual Portfolio Vulnerability Evaluation` 실제 GitHub Actions 성공
- Phase 5 live 통합 실행 경로 구현 후 `Manual Macro Review Evaluation` 실제 GitHub Actions 성공
- AI 주간 보고서 출력 계약 추가 후 `Manual Macro Review Evaluation` 실제 GitHub Actions 성공
- `test/risk-model.test.js`, `test/area-aggregation.test.js`, `test/overall-risk.test.js`, `test/portfolio-vulnerability.test.js`, `test/macro-review.test.js`, `test/weekly-report-output.test.js` 통과
- `risk-output.example.json`, `portfolio-vulnerability.example.json`, `macro-review.example.json`, `weekly-report-output.example.json` schema 검증 통과
- 실제 FRED 수집 기반 `riskOutput` → `portfolioVulnerability` → `macroReviewOutput` 통합 출력 schema 통과

검증 대기:
- AI 보고서 생성 구현

## 다음 세션이 읽을 문서

AI 보고서 생성 구현 시 필수:
- `AGENTS.md`
- `docs/REPORT_SPEC.md`
- `docs/RISK_MODEL.md`
- `docs/PORTFOLIO.md`
- `prompts/weekly-analysis.md`
- `docs/HANDOFF.md`

선택:
- 통합 출력 계약 확인 시 `data/schema/macro-review-output.schema.json`
- AI 보고서 출력 계약 확인 시 `data/schema/weekly-report-output.schema.json`
- 구조적 결정 확인 시 `docs/DECISIONS.md`
- 아키텍처 원칙 확인 시 `docs/ARCHITECTURE.md`

## 미해결

- AI 보고서 생성 구현
- Markdown/Notion/Telegram 렌더링 구현
