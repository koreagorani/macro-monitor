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
- AI 주간 보고서 생성 구현 완료
- 다음 검증: `Manual Weekly Report Generation` 최신 main에서 재실행

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

### Phase 5 포트폴리오 취약도 및 통합 실행 경로

- `data/schema/portfolio-vulnerability-output.schema.json` 추가
- `src/portfolio/evaluate-portfolio-vulnerability.js` 구현
- `scripts/run-portfolio-vulnerability.js` 추가
- `package.json`에 `evaluate:portfolio` 명령 추가
- `.github/workflows/manual-portfolio-vulnerability.yml` 추가
- `Manual Portfolio Vulnerability Evaluation` 실제 실행 성공 확인
  - run: `29087059587`
  - job: `evaluate-portfolio-vulnerability`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:portfolio` 모두 성공
- `data/schema/macro-review-output.schema.json` 추가
- `src/review/build-macro-review-output.js` 구현
- `scripts/run-macro-review.js` 추가
- `package.json`에 `evaluate:macro-review` 명령 추가
- `.github/workflows/manual-macro-review.yml` 추가
- `Manual Macro Review Evaluation` 실제 실행 성공 확인
  - run: `29087571966`
  - job: `evaluate-macro-review`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:macro-review` 모두 성공

### AI 주간 보고서 생성 설계

- `data/schema/weekly-report-output.schema.json` 추가
- `data/examples/weekly-report-output.example.json` 추가
- `scripts/validate-examples.js` 확장
- `prompts/weekly-analysis.md` 보강
- `docs/REPORT_SPEC.md` 보강
- `test/weekly-report-output.test.js` 추가
- `docs/DECISIONS.md` 갱신
  - D-024: AI 주간 보고서 출력 계약 확정
- 설계 검증 완료
  - run: `29088698198`
  - job: `evaluate-macro-review`
  - `npm ci`, `npm test`, `npm run validate:examples`, `npm run evaluate:macro-review` 모두 성공

### AI 주간 보고서 생성 구현

- `src/clients/openai-client.js` 추가
  - OpenAI Responses API 호출 클라이언트
  - `OPENAI_API_KEY` 필수
  - `OPENAI_MODEL` optional, 미설정 또는 빈 값이면 `gpt-4.1` 사용
  - `OPENAI_BASE_URL`, `OPENAI_MAX_OUTPUT_TOKENS` optional
  - API key와 원문 응답 전체를 로그에 남기지 않음
  - 실패 시 안전한 error code/message만 반환
- `src/report/generate-weekly-report.js` 추가
  - `macroReviewOutput`과 `prompts/weekly-analysis.md`를 사용해 AI 보고서 생성
  - AI 응답 JSON 파싱
  - `weekly-report-output` schema 검증
  - macro-review 원본과 consistency 검증
  - AI가 `overallLevel`, `overallScore`, `confidence`, 상위 테마 ID, 영역별 score/status, 테마별 score/level을 바꾸면 실패
- `scripts/run-weekly-report.js` 추가
  - 실제 FRED 기반 숫자 파이프라인 실행
  - macro-review 출력 생성 및 검증
  - OpenAI API 호출
  - weekly-report-output 생성 및 최종 schema 검증
- `package.json`에 `generate:weekly-report` 명령 추가
- `.github/workflows/manual-weekly-report.yml` 추가
  - `Manual Weekly Report Generation`
  - `FRED_API_KEY`, `OPENAI_API_KEY` 사용
- `test/openai-client.test.js` 추가
- `test/weekly-report-generation.test.js` 추가
- `docs/REPORT_SPEC.md` 갱신
- `docs/DECISIONS.md` 갱신
  - D-025: AI 주간 보고서 생성 실행 경로 확정

### AI 주간 보고서 생성 검증 실패 및 보강

- `Manual Weekly Report Generation` 첫 실행 실패 확인
  - run: `29089456395`
  - job: `generate-weekly-report`
  - `npm ci` 성공
  - `npm test` 실패
  - 이후 `npm run validate:examples`, `npm run generate:weekly-report` skipped
- 실패 성격
  - 실제 OpenAI 호출 전 단계에서 실패
  - 신규 `test/weekly-report-generation.test.js` 쪽 fixture 결합도가 높아 예시 파일 정합성 변화에 취약했음
- 1차 수정
  - `test/weekly-report-generation.test.js`가 `macro-review.example.json`에 직접 의존하지 않도록 변경
  - `weekly-report-output.example.json`에서 self-contained `macroReviewOutput` fixture를 생성해 generator의 schema/consistency 검증 책임만 테스트
  - JSON deep clone helper로 `structuredClone` 의존 제거
  - 수정 커밋: `f5b8dbb3b2270bbbced5ee81417e10a82d5f9937`
- 2차 보강
  - OpenAI client가 `text.format.type = "json_object"`를 사용하도록 변경
  - OpenAI client 테스트에서 JSON output 요청 여부를 검증하도록 추가
  - `docs/REPORT_SPEC.md`, `docs/DECISIONS.md`에 JSON mode 사용 방침 기록
  - 수정 커밋:
    - `3a7a401b807a72db242625e21fa4a30d253ba0f9`
    - `2cb5645958f4c650e2d04af6393d65a1e530f8e7`
    - `d78f7beca5452c542364899f9dd4bd8b41cb3ea3`
    - `a9683a4db20a13c657b33bcdd2a077f7e440b86e`

### AI 주간 보고서 생성 2차 Actions 실패 및 테스트 보강

- `Manual Weekly Report Generation` 재실행 실패 확인
  - run: `29188697625`
  - commit: `75dc2e780d8a67bff9d6ddb75696356d15fdbe02`
  - job: `generate-weekly-report`
  - `npm ci` 성공
  - `npm test`에서 58개 중 57개 통과, 1개 실패
  - `npm run validate:examples`, `npm run generate:weekly-report` skipped
- 실패 원인
  - `test/weekly-report-generation.test.js`가 프롬프트의 안전 규칙을 정확한 연속 문자열 `입력에 없는 최신 뉴스`로 검사함
  - 프롬프트에는 같은 의미의 금지 규칙이 있었지만 문장 구성 차이로 테스트가 실패함
  - 실제 FRED 수집 및 OpenAI API 호출 전 단계의 테스트 결합도 문제임
- 수정
  - 안전 규칙 검증을 삭제하거나 약화하지 않고 의미별 필수 문구 조각을 검사하도록 변경
  - 숫자 재계산, 위험 등급·임계값 변경, 입력에 없는 최신 뉴스 생성, 특정 종목 추천, 개인 보유정보 추정 금지를 계속 검증
  - 수정 커밋: `dba09296b4b8c0c98a1c0037835b0d75e0abe1f5`
- 현재 상태
  - 최신 main에서 `Manual Weekly Report Generation` 재검증 대기
  - Actions 성공 전까지 AI 주간 보고서 생성 단계를 완료 처리하지 않음

### AI 주간 보고서 생성 3차 Actions 실패 — OpenAI API 429

- `Manual Weekly Report Generation` 재실행 실패 확인
  - run: `29189293756`
  - job: `generate-weekly-report`
  - `npm ci` 성공
  - `npm test` 성공: 58개 전체 통과
  - `npm run validate:examples` 성공
  - `npm run generate:weekly-report`에서 실패
- 안전한 오류 요약
  - code: `OPENAI_API_REQUEST_FAILED`
  - message: `OpenAI API request failed with status 429.`
  - API key와 OpenAI 원문 응답은 로그에 노출되지 않음
- 판단
  - 이전 테스트 결합도 문제는 해결됨
  - 실제 FRED 기반 파이프라인 뒤 OpenAI API 호출 단계까지 도달함
  - HTTP 429는 OpenAI API 사용량 한도, rate limit 또는 API 결제·크레딧 상태 확인이 필요함
  - ChatGPT 구독과 OpenAI API 결제·크레딧은 별도일 수 있음
- 현재 상태
  - OpenAI API 계정의 Billing/Usage/Limits 확인 후 최신 main에서 재실행 대기
  - Actions 성공 전까지 AI 주간 보고서 생성 단계를 완료 처리하지 않음

### AI 주간 보고서 생성 4차 Actions 실패 — schema 불일치 및 Structured Outputs 보강

- `Manual Weekly Report Generation` 재실행 실패 확인
  - run: `29189631808`
  - job: `generate-weekly-report`
  - `npm ci`, `npm test`, `npm run validate:examples` 성공
  - OpenAI API 결제 후 실제 API 호출 성공
  - `npm run generate:weekly-report`의 로컬 weekly-report-output schema 검증에서 실패
- 실패 원인
  - 기존 JSON mode는 유효한 JSON만 보장하고 weekly-report-output의 필드명과 중첩 구조는 강제하지 않음
  - AI가 `sourceMacroReview`, `portfolioThemes`, `hedgeAndDefense`, `nextWeekChecklist` 등을 schema와 다른 구조로 반환함
  - 로컬 schema 검증이 잘못된 출력을 정상적으로 차단함
- 보강
  - Responses API 요청을 `text.format.type = "json_schema"`, `strict: true` Structured Outputs로 변경
  - `data/schema/weekly-report-output.schema.json`을 API 출력 schema로 전달
  - 문서 메타데이터인 `$schema`, `$id`만 API 요청용 schema에서 제거
  - OpenAI client의 요청별 response format override와 관련 테스트 추가
  - 로컬 schema 검증과 macro-review consistency 검증은 그대로 유지
  - 관련 결정: D-026
- 수정 커밋
  - `726f0ec0048b48988982c228a148d71ec52c2534`
  - `5aebbb41d8b2704d1963366e0bacf1e68ed2f9c4`
  - `b41caa8c23ecc4bd38da61f7eaedbbbe200ed986`
  - `f1f42487ba8c36eaa351206c9c8181ef8d2b3cc5`
  - `acbdb5bfc705352544336e5fcbe22d00f545b076`
  - `5aadb1728eb2dc0fcc35b56dd9591a3610a2a0b2`
- 현재 상태
  - 최신 main에서 `Manual Weekly Report Generation` 재검증 대기
  - Actions 성공 전까지 AI 주간 보고서 생성 단계를 완료 처리하지 않음

## 현재 실행 방법

GitHub Actions:
- AI 주간 보고서 생성 검증: Actions → `Manual Weekly Report Generation`
- 통합 매크로 리뷰 검증: Actions → `Manual Macro Review Evaluation`
- 포트폴리오 취약도 검증: Actions → `Manual Portfolio Vulnerability Evaluation`
- 위험 모델 검증: Actions → `Manual Risk Model Evaluation`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- Lockfile 생성: Actions → `Generate Package Lock`
- 선택적으로 `as_of` 입력
- 저장소 Secret 필요:
  - `FRED_API_KEY`
  - `OPENAI_API_KEY`
- 선택 repository variable:
  - `OPENAI_MODEL`

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run generate:weekly-report -- YYYY-MM-DD`
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
- test fixture 수정 및 JSON mode 보강 후 `Manual Weekly Report Generation` 최신 main에서 재실행
- `test/openai-client.test.js` 통과 확인
- `test/weekly-report-generation.test.js` 통과 확인
- `npm run validate:examples` 전체 통과 확인
- 실제 FRED 기반 macro-review 생성 후 OpenAI API 호출 및 weekly-report-output schema/consistency 검증 확인

## 다음 세션이 읽을 문서

AI 보고서 생성 검증 및 후속 구현 시 필수:
- `AGENTS.md`
- `docs/REPORT_SPEC.md`
- `prompts/weekly-analysis.md`
- `docs/HANDOFF.md`

Markdown 렌더링 구현 시 추가 확인:
- `data/schema/weekly-report-output.schema.json`
- `docs/DECISIONS.md`

선택:
- 통합 출력 계약 확인 시 `data/schema/macro-review-output.schema.json`
- AI 보고서 출력 계약 확인 시 `data/schema/weekly-report-output.schema.json`
- 구조적 결정 확인 시 `docs/DECISIONS.md`
- 아키텍처 원칙 확인 시 `docs/ARCHITECTURE.md`

## 미해결

- test fixture 수정 및 JSON mode 보강 후 GitHub Actions 재검증
- AI 보고서 생성 구현 실제 Actions 검증
- Markdown/Notion/Telegram 렌더링 구현