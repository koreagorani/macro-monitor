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
- AI 주간 보고서 생성 구현 및 실제 GitHub Actions 검증 완료
- weekly-report-output → Markdown 렌더링 구현 및 실제 GitHub Actions 검증 완료
- Notion 저장 완료 조건 및 저장 계약 설계 완료
- Notion 저장 구현 완료
- Notion 저장 실제 GitHub Actions 검증은 실패 상태
- 다음 작업: `Manual Weekly Report Notion Save` run `29328856682`의 저장 단계 실패 원인 분석 및 수정

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

### AI 주간 보고서 생성

- `data/schema/weekly-report-output.schema.json` 추가
- `data/examples/weekly-report-output.example.json` 추가
- `prompts/weekly-analysis.md` 보강
- `docs/REPORT_SPEC.md` 보강
- OpenAI Responses API client 구현
- `src/report/generate-weekly-report.js` 구현
- `scripts/run-weekly-report.js` 추가
- `.github/workflows/manual-weekly-report.yml` 추가
- `Manual Weekly Report Generation` 최신 main 실행 성공 확인
  - run: `29189858304`
  - job: `generate-weekly-report`
  - conclusion: `success`
- 실제 검증 범위
  - 실제 FRED 기반 macro-review 생성
  - OpenAI Responses API Structured Outputs 호출
  - weekly-report-output JSON 생성
  - weekly-report-output schema 검증
  - macro-review consistency 검증

### weekly-report-output → Markdown 렌더링

- `src/render/render-weekly-report-markdown.js` 추가
  - weekly-report-output만 입력받는 순수 동기 렌더러
  - AI 및 외부 API 재호출 없음
  - 숫자·등급·임계값 재계산 없음
  - 빈 배열과 일부 누락 필드 안전 처리
- `scripts/run-weekly-report.js`의 live weekly-report 파이프라인을 재사용 가능하도록 분리
- `scripts/render-weekly-report-markdown.js` 추가
- `package.json`에 `render:weekly-report` 추가
- `test/weekly-report-markdown.test.js` 추가
- `.github/workflows/manual-weekly-report-markdown.yml` 추가
- `docs/REPORT_SPEC.md`에 Markdown 출력 계약 반영
- `docs/DECISIONS.md`에 D-027 기록
- `Manual Weekly Report Markdown Render` 최신 main 실행 성공 확인
  - run: `29190592678`
  - commit: `5ac3c127cf3939b289679761ad9cf9f03c989bb2`
  - job: `render-weekly-report-markdown`
  - conclusion: `success`
- 실제 출력 확인
  - 기준일: `2026-07-12`
  - 전체 위험: `정상`
  - 전체 위험 점수: `0.202678571429`
  - 권장 대응: `유지`
  - Markdown 표와 필수 섹션 preview 정상
- artifact 확인
  - name: `weekly-report-markdown`
  - artifact id: `8259382369`
  - size: 1,722 bytes
  - expires: `2026-07-19T11:18:40Z`
  - 저장소 커밋 없이 Actions artifact로만 보관

### Notion 저장 계약 및 완료 조건 설계

- 구현 전 저장 계약 확정
- 저장 입력
  - 본문: weekly-report-output 기반 Markdown
  - properties: 기준일, 생성시각, 전체 위험 단계·점수, 신뢰도, schema version, Report Key
  - weekly-report-output 전체 JSON은 Notion에 중복 저장하지 않음
- 저장 대상
  - 주간 보고서 archive database의 data source
  - runtime parent는 `NOTION_DATA_SOURCE_ID`
- 중복 처리
  - `Report Key = weekly-report:{asOf}`
  - 기존 page가 없으면 create, 하나면 update, 둘 이상이면 실패
- Notion API
  - version `2026-03-11`
  - native Markdown create 및 `replace_content` update
  - 자체 Markdown-to-block parser 미구현
- 필수 Secrets
  - `NOTION_API_KEY`
  - `NOTION_DATA_SOURCE_ID`
  - 기존 `FRED_API_KEY`, `OPENAI_API_KEY`
- 선택 Variables
  - `OPENAI_MODEL`
  - `NOTION_API_VERSION` (기본 `2026-03-11`)
- 완료 조건
  - mock 단위 테스트와 create/update/idempotency/read-back 검증
  - `Manual Weekly Report Notion Save` 최신 main 성공
  - 실제 보고서·JSON·Secret의 저장소 및 artifact 비보관
  - HANDOFF에 run과 저장 검증 결과 기록
- 담당 문서 갱신
  - `docs/ARCHITECTURE.md`
  - `docs/REPORT_SPEC.md`
  - `docs/DECISIONS.md` D-028

### Notion 저장 구현

- `src/clients/notion-client.js`
  - Notion API version `2026-03-11` 기본값
  - Report Key data source query, native Markdown create, properties update, Markdown `replace_content`, read-back 지원
  - 429와 일시적 5xx 제한 재시도
  - Secret, data source ID, page ID·URL, 원문 응답 비로그 정책 적용
- `src/notion/build-notion-report-payload.js`
  - weekly-report-output의 허용된 메타데이터만 properties로 whitelist 매핑
  - `Report Key = weekly-report:{asOf}`
  - 전체 JSON과 개인 보유정보는 payload에 포함하지 않음
- `src/notion/save-weekly-report-to-notion.js`
  - 0건 create, 1건 update, 2건 이상 `NOTION_DUPLICATE_REPORT_KEY` 실패
  - 저장 후 properties와 Markdown의 제목·기준일·필수 주의 문구 read-back 검증
- `scripts/save-weekly-report-to-notion.js`
  - 실제 FRED → macro-review → OpenAI weekly-report-output → Markdown → Notion 저장
  - 성공 출력은 `created|updated`, 기준일, 검증 여부만 포함
- `package.json`에 `save:weekly-report:notion` 추가
- mock 테스트 추가
  - `test/notion-client.test.js`
  - `test/notion-report-payload.test.js`
  - `test/notion-save.test.js`
- `.github/workflows/manual-weekly-report-notion.yml` 추가
  - workflow: `Manual Weekly Report Notion Save`
  - artifact와 전체 보고서 로그 출력 없음
- 구조적 계약 변경 없음
  - 기존 D-028과 ARCHITECTURE/REPORT_SPEC 계약을 그대로 구현

### Notion 저장 1차 Actions 실패 및 API payload 보강

- `Manual Weekly Report Notion Save` 첫 실행 실패
  - run: `29328029596`
  - commit: `6f48b8e9bac5e3428975104bead15aa8dd8525ef`
  - `npm ci` 성공
  - `npm test` 성공: 82개 전체 통과
  - `npm run validate:examples` 성공
  - `Save weekly report to Notion`에서 HTTP 400 실패
- 안전한 오류 요약
  - code: `NOTION_BAD_REQUEST`
  - status: `400`
  - Secret 및 Notion 원문 응답은 로그에 노출되지 않음
- 원인 판단 및 수정
  - Notion API `2026-03-11` page property value와 data source parent에 명시적 `type` discriminator가 필요함
  - 모든 properties에 `type`을 추가하고 parent에 `type: data_source_id` 추가
  - 후속 실패 분석용으로 원문 응답 없이 `query_report_key|create_page|update_properties|replace_markdown|read_back` operation만 안전한 오류 message에 포함
  - 신규 mock 회귀 테스트 17개 통과
- 구조적 계약 변경 없음
  - D-028과 REPORT_SPEC의 저장 계약은 유지

### Notion 저장 2차 Actions 실패 및 안전한 진단 보강

- `Manual Weekly Report Notion Save` 재실행 실패
  - run: `29328469168`
  - commit: `352111a0a7d84edfc0cf1c8dcb4522b6e23da168`
  - `npm test` 성공: 82개 전체 통과
  - `npm run validate:examples` 성공
  - `create_page`에서 HTTP 400 실패
- 확인된 범위
  - Notion 인증과 data source 접근 성공
  - Report Key query 성공
  - 신규 page create payload 검증 단계에서만 실패
- 진단 보강
  - 저장 전 대상 data source의 8개 property 이름과 타입을 계약과 대조
  - schema 불일치 시 `NOTION_DATA_SOURCE_SCHEMA_MISMATCH`와 안전한 property/type 차이만 출력
  - Notion 400 validation error는 ID·token·URL을 제거하고 400자로 제한한 validation code/message만 출력
  - Markdown 본문과 원문 API 응답 전체는 출력하지 않음
  - mock 회귀 테스트 19개 통과

### Notion 저장 3차 Actions 실패

- `Manual Weekly Report Notion Save` 재실행 실패
  - run: `29328856682`
  - url: `https://github.com/koreagorani/macro-monitor/actions/runs/29328856682`
  - job: `save-weekly-report-notion`
  - conclusion: `failure`
- 확인된 단계
  - Set up job: success
  - Check out repository: success
  - Set up Node.js: success
  - Install dependencies: success
  - Run tests: success
  - Validate synthetic examples: success
  - Save weekly report to Notion: failure
- 판단
  - 테스트와 합성 예시 검증은 통과함
  - 실패는 Notion 저장 단계에서 재현됨
  - 이전 2차 실패 후 추가한 안전한 진단이 최신 run의 실패 원인 분석 출발점
  - 실제 저장 성공 전까지 Notion 저장 단계를 완료 처리하지 않음
- 다음 작업
  - run `29328856682`의 `Save weekly report to Notion` 단계 로그를 기준으로 안전한 validation message 확인
  - data source property 계약, native Markdown create payload, parent/data source payload를 재검토
  - 원문 Notion 응답, page URL, data source ID, Secret, 전체 Markdown 본문은 로그나 저장소에 남기지 않음

### Notion 저장 4차 Actions 실패 — title property 이름 불일치 확정

- `Manual Weekly Report Notion Save` 재실행 실패
  - run: `29568459209`
  - commit: `b128bb5319967c31444c5581bd33eeaa41c455fc`
  - `npm test` 성공: 84개 전체 통과
  - `npm run validate:examples` 성공
  - Notion schema preflight에서 중단
- 확정 원인
  - error: `NOTION_DATA_SOURCE_SCHEMA_MISMATCH`
  - detail: `Name:missing->title`
  - 대상 data source의 나머지 7개 property 이름·타입은 계약과 일치
  - 기존 title property의 이름이 정확히 `Name`이 아님
- 사용자 조치
  - Notion의 맨 왼쪽 기존 title 열을 새로 만들지 말고 정확히 `Name`으로 이름 변경
  - 대소문자와 앞뒤 공백까지 일치시킨 뒤 최신 main에서 새 workflow run 실행
- 코드 변경 불필요
  - D-028 및 REPORT_SPEC의 명시적 property 계약 유지
  - 실제 저장 성공 전까지 Notion 저장 단계 완료 처리 금지

### Notion 저장 5차 Actions 실패 — read-back 검증 보강

- `Manual Weekly Report Notion Save` 재실행 실패
  - run: `29568995281`
  - `npm test` 성공
  - `npm run validate:examples` 성공
  - data source schema preflight 통과
  - page create 또는 update 통과
  - 저장 후 read-back 검증에서 `NOTION_READ_BACK_VERIFICATION_FAILED`
- 판단
  - Notion page 저장 요청 자체는 성공했으며 같은 Report Key page가 존재할 가능성이 높음
  - 다음 실행은 upsert 규칙에 따라 기존 page update 경로로 복구 가능
  - 즉시 read-back 시 Notion 반영 지연 또는 특정 검증 항목 불일치 가능
- 보강
  - 최대 3회, 500ms/1000ms 간격으로 read-back 재검증
  - 실패 시 값이나 본문 대신 `property.*`, `markdown.*` 불일치 항목 이름만 출력
  - stale read-back 복구 mock 테스트 추가
  - Notion 관련 mock 테스트 20개 통과
- 최신 main에서 새 workflow run 대기

## 현재 실행 방법

GitHub Actions:
- Notion 저장 검증: Actions → `Manual Weekly Report Notion Save`
- Markdown 렌더링 검증: Actions → `Manual Weekly Report Markdown Render`
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
  - `NOTION_API_KEY`
  - `NOTION_DATA_SOURCE_ID`
- 선택 repository variable:
  - `OPENAI_MODEL`
  - `NOTION_API_VERSION` (기본 `2026-03-11`)

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run save:weekly-report:notion -- YYYY-MM-DD`
- `npm run render:weekly-report -- YYYY-MM-DD`
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

추가 확인 완료:
- `test/openai-client.test.js` 통과
- `test/weekly-report-generation.test.js` 통과
- `npm run validate:examples` 전체 통과
- 실제 FRED 기반 macro-review 생성 후 OpenAI Structured Outputs 호출 성공
- weekly-report-output schema 및 macro-review consistency 검증 성공
- `Manual Weekly Report Generation` run `29189858304` 성공
- `Manual Weekly Report Markdown Render` run `29190592678` 성공

검증 실패 기록:
- `Manual Weekly Report Notion Save` run `29328029596` 실패
- `Manual Weekly Report Notion Save` run `29328469168` 실패
- `Manual Weekly Report Notion Save` run `29328856682` 실패
- `Manual Weekly Report Notion Save` run `29568459209` 실패: `Name:missing->title`
- `Manual Weekly Report Notion Save` run `29568995281` 실패: 저장 후 read-back verification

## 다음 세션이 읽을 문서

Notion 저장 Actions 검증 및 실패 분석 시 필수:
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/REPORT_SPEC.md`
- `docs/HANDOFF.md`

추가 확인:
- `docs/DECISIONS.md` D-028
- `data/schema/weekly-report-output.schema.json`
- `src/render/render-weekly-report-markdown.js`
- `scripts/run-weekly-report.js`
- `src/clients/notion-client.js`
- `src/notion/build-notion-report-payload.js`
- `src/notion/save-weekly-report-to-notion.js`
- `.github/workflows/manual-weekly-report-notion.yml`

## 미해결

- 최신 main에서 read-back retry 보강 후 `Manual Weekly Report Notion Save`를 새로 실행하고 성공 검증
- 성공 후 run ID와 `created|updated`, read-back 검증 결과를 HANDOFF에 기록
- Actions 성공 후 Notion 저장 단계를 완료 처리하고 Telegram 알림 구현으로 이동
