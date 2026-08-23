# Weekly Report Specification

## 0. 보고서 v2 생성 계약

보고서 v2는 facts와 analysis의 소유자를 분리한다.

- deterministic facts: `data/schema/report-facts.schema.json`
- OpenAI output: `data/schema/weekly-analysis-output.schema.json`
- code-assembled final output: `data/schema/weekly-report-output.schema.json`
- macro-review integration: `data/schema/macro-review-output.schema.json`

OpenAI는 최종 weekly-report-output을 생성하지 않는다. 코드가 `macroReviewOutput.reportFacts`와 AI analysis를 결합하며 Markdown, Notion, Telegram은 이 최종 객체 하나만 입력받는다.

### 실행 계약

AI 주간 보고서 생성 명령:

```bash
npm run generate:weekly-report -- YYYY-MM-DD
```

입력 날짜를 생략하면 UTC 오늘 기준으로 실행한다.

```bash
npm run generate:weekly-report
```

내부 흐름:

```text
collectAllIndicators
→ risk model evaluation
→ portfolio vulnerability evaluation
→ deterministic reportFacts 생성·검증
→ macro-review output validation
→ OpenAI Responses API analysis-only 호출
→ weekly-analysis-output JSON 파싱·schema·ID 검증
→ code-owned weekly-report-output v2 조립
→ final schema와 facts deep-equal 검증
→ JSON 출력
```

OpenAI API 키는 `OPENAI_API_KEY` 환경변수 또는 GitHub Secret으로만 전달한다. API 키와 OpenAI 원문 응답 전체는 로그에 남기지 않는다.

OpenAI 호출은 Structured Outputs(`text.format.type = "json_schema"`, `strict: true`)로 요청하고 `data/schema/weekly-analysis-output.schema.json`을 출력 계약으로 전달한다. `report-facts`와 final weekly-report-output은 API 출력 schema가 아니다.

### AI 역할

AI는 다음만 수행한다.

- 핵심 변화 요약
- 위험 성격 설명
- 상충 신호 정리
- source ID를 참조한 영역·취약 테마의 핵심 이유 정리
- 헷지 필요성 문장화
- 다음 주 체크리스트 문장화

AI는 다음을 수행하지 않는다.

- 숫자·날짜·단위·상태·점수·임계값 생성 또는 재계산
- indicator·area·theme·candidate의 canonical 이름 생성
- 위험 등급 또는 포트폴리오 취약도 재판정
- 입력에 없는 최신 뉴스, 일정, 가격 생성
- 특정 종목 매수·매도 추천
- 실제 개인 보유 수량·평가금액 추정

### deterministic facts

- `overallRisk`: `riskOutput.overallRisk`의 level, label, raw score, confidence, reasons, triggeredRules
- `indicators`: config의 MVP 6개 exact-set. market 5개 실제 값·관측일·1주·4주 변화와 Core PCE 관측일·기준월·전월비·이전치·3개월 평균·consensus를 보존
- `areaRisks`: enabled area 4개 exact-set과 source score/status/weight/contributingIndicators
- `portfolioThemes`: portfolio vulnerability 상위 최대 3개와 deterministic hedge candidate ID
- `riskContribution`: 기존 area 및 overall 정규화 가중평균을 지표별로 분해한 raw number
- `reportPriority`: config에 정의한 서로 다른 정수이며 낮은 값이 높은 우선순위
- Core PCE `currentObservationDate`는 관측일이며 실제 BEA 발표일로 표현하지 않는다.
- 내부 계산·판정·정렬·consistency에는 raw JS number를 사용한다. 표시 반올림은 채널 경계에서만 수행한다.

### 출력 검증

검증 순서:

1. reportFacts schema 통과
2. indicator exact 6, enabled area exact 4, theme 최대 3, duplicate/placeholder 차단
3. reportFacts와 indicator/risk/portfolio source의 deep consistency
4. AI JSON 파싱과 weekly-analysis-output schema 통과
5. AI area/theme ID가 source facts와 exact-set이며 candidate ID가 source facts의 허용 집합에 포함
6. code-assembled weekly-report-output v2 schema 통과
7. final `facts`가 `macroReviewOutput.reportFacts`와 deep-equal

검증 실패 시 임의로 보정하지 않고 명확한 error code와 요약 메시지만 출력한다.

`quality.shouldAbort === true`이면 macro-review의 `reportFacts`는 `null`이다. OpenAI와 정상 weekly report 생성은 실행하지 않고 기존 품질 실패 Telegram 경로를 유지한다.

## 0-1. Markdown 렌더링 계약

Markdown 렌더링 단계의 단일 입력은 schema 검증과 macro-review consistency 검증을 통과한 `weekly-report-output` JSON이다.

실행 명령:

```bash
npm run render:weekly-report -- YYYY-MM-DD
```

날짜를 생략하면 UTC 오늘 기준으로 실제 FRED 수집, deterministic facts, OpenAI analysis, code-owned weekly-report-output v2 조립까지 실행한 뒤 Markdown을 렌더링한다.

기본 출력은 stdout이다. `REPORT_MARKDOWN_OUTPUT` 환경변수에 경로를 지정하면 해당 경로에 UTF-8 Markdown 파일을 쓰고 보고서 본문 대신 안전한 파일 생성 요약만 stdout에 출력한다.

렌더러 원칙:

- `src/render/render-weekly-report-markdown.js`의 순수 동기 함수가 weekly-report-output만 읽어 Markdown 문자열을 생성한다.
- 렌더링 단계에서는 AI 또는 외부 API를 다시 호출하지 않는다.
- 숫자, 점수, 등급, 임계값을 계산하거나 재판정하지 않는다.
- 구조화 입력에 있는 점수와 문자열을 그대로 표시한다.
- 핵심 변화와 취약 테마는 각각 최대 3개, 헷지 후보는 최대 2개만 표시한다.
- 빈 배열 또는 일부 누락된 중첩 필드는 `해당 없음` 또는 `—`로 안전하게 표시한다.
- 실제 개인 보유 수량, 평가금액, 계좌별 비중 필드는 렌더링하지 않는다.

MVP 필수 섹션:

1. 제목과 기준일·생성시각
2. 전체 위험 요약
3. 핵심 변화
4. 영역별 위험 요약
5. 취약 테마 상위 3개
6. 헷지 필요성 및 대응 제안
7. 다음 주 확인 조건
8. 취약도의 의미에 대한 주의 문구

운영 보고서는 공개 저장소에 커밋하지 않는다. GitHub Actions에서는 전체 Markdown을 로그에 출력하지 않고 앞부분 24줄만 preview하며, 전체 파일은 7일 보관 artifact `weekly-report-markdown`으로만 제공한다.

## 0-2. Notion 저장 계약

### 저장 입력과 대상

Notion 저장 단계는 다음 두 입력을 사용한다.

- page 본문: `renderWeeklyReportMarkdown(weeklyReportOutput)` 결과
- page properties: weekly-report-output의 검증된 메타데이터

weekly-report-output 전체 JSON은 MVP에서 Notion에 별도 저장하지 않는다. 사람이 읽는 보고서 보관이 목적이므로 Markdown을 본문으로 저장하고, 검색·정렬·중복 방지에 필요한 값만 properties에 기록한다.

저장 대상은 특정 page 아래의 child page가 아니라 주간 보고서 아카이브용 database의 data source다. page 생성 parent는 최신 Notion API 계약에 따라 `data_source_id`를 사용한다.

### data source property 계약

대상 data source에는 다음 properties가 정확한 이름과 타입으로 존재해야 한다.

| Property | Notion type | weekly-report-output source |
|---|---|---|
| Name | title | `presentation.title` |
| Report Date | date | `asOf` |
| Generated At | date | `generatedAt` |
| Overall Risk | select | `facts.overallRisk.level` |
| Overall Score | number | `facts.overallRisk.score` |
| Confidence | select | `facts.overallRisk.confidence` |
| Schema Version | rich_text | `schemaVersion` |
| Report Key | rich_text | `weekly-report:{asOf}` |

properties는 입력값을 그대로 매핑하며 점수·등급을 재계산하거나 재판정하지 않는다.

### 생성 및 갱신

- 저장 전 `Report Key`로 data source를 조회한다.
- 일치 page가 없으면 Markdown 본문과 properties로 새 page를 생성하고 결과를 `created`로 기록한다.
- 일치 page가 하나면 properties를 갱신하고 Markdown 본문 전체를 `replace_content`로 교체하며 결과를 `updated`로 기록한다.
- 일치 page가 둘 이상이면 임의 page를 선택하지 않고 `NOTION_DUPLICATE_REPORT_KEY`로 실패한다.
- Notion native Markdown 입력을 사용하고 자체 Markdown-to-block 변환기는 구현하지 않는다.

### 환경변수

필수 GitHub Secrets:

- `NOTION_API_KEY`: Notion connection 또는 personal access token
- `NOTION_DATA_SOURCE_ID`: 주간 보고서 archive data source ID
- 기존 live 생성용 `FRED_API_KEY`
- 기존 live 생성용 `OPENAI_API_KEY`

선택 Repository Variables:

- `OPENAI_MODEL`: 기존 OpenAI 모델 override
- `NOTION_API_VERSION`: 기본값 `2026-03-11`; 명시적 호환성 검증 없이 자동 최신 버전으로 올리지 않음

`NOTION_DATABASE_ID`와 `NOTION_PAGE_ID`는 MVP runtime 입력으로 사용하지 않는다. database ID는 data source ID를 찾는 초기 설정 과정에서만 필요할 수 있다.

### 보안 및 오류

- Secret 값과 Notion 원문 응답 전체를 출력하지 않는다.
- page ID, page URL, data source ID도 공개 Actions 로그에 출력하지 않는다.
- 성공 로그는 `created|updated`, 기준일, 검증 성공 여부만 포함한다.
- 실패 로그는 안전한 내부 error code, HTTP status, 요약 message만 포함한다.
- 401, 403, 404, 409, 429와 5xx를 구분하고 429 및 일시적 5xx만 제한적으로 재시도한다.

### 완료 조건

단위·mock 테스트:

1. Markdown과 properties payload가 weekly-report-output 값만 사용
2. 숫자·등급 재계산 없음
3. create 경로와 update 경로
4. 같은 Report Key 재실행 시 중복 page 미생성
5. 중복 Report Key가 둘 이상이면 안전하게 실패
6. 빈 optional 배열과 null score 처리
7. 개인 보유 수량·평가금액 field 비전송
8. Secret 및 원문 API 오류 비노출
9. 401·403·404·429·5xx 오류 분류
10. 실제 네트워크 없이 mock fetch로 전체 저장 orchestration 검증

GitHub Actions 완료 기준:

1. 최신 main의 `Manual Weekly Report Notion Save` 실행
2. `npm ci` 성공
3. `npm test` 성공
4. `npm run validate:examples` 성공
5. 실제 weekly-report-output 및 Markdown 생성 성공
6. Notion create 또는 update 성공
7. 저장 후 properties와 Markdown 최소 read-back 검증 성공
8. job conclusion `success`
9. 실제 보고서·JSON·Secret이 저장소 또는 Actions artifact에 남지 않음
10. `docs/HANDOFF.md`에 run ID, create/update 결과, 검증 범위, 다음 단계 기록

### 구현 파일 계획

- `src/clients/notion-client.js`
  - 인증, API version header, query/create/update/read-back, 안전한 오류와 제한적 retry
- `src/notion/build-notion-report-payload.js`
  - Markdown과 weekly-report-output metadata를 Notion properties 및 native Markdown payload로 매핑
- `src/notion/save-weekly-report-to-notion.js`
  - Report Key 조회, create/update 분기, 중복 감지, read-back 검증
- `scripts/save-weekly-report-to-notion.js`
  - live FRED → macro-review → weekly-report-output → Markdown → Notion 저장
- `test/notion-client.test.js`
  - HTTP 요청·오류·Secret 비노출·retry mock
- `test/notion-report-payload.test.js`
  - properties/native Markdown payload 매핑과 개인 field 비전송
- `test/notion-save.test.js`
  - create/update/idempotency/duplicate/read-back orchestration mock
- `package.json`
  - `save:weekly-report:notion` command
- `.github/workflows/manual-weekly-report-notion.yml`
  - `Manual Weekly Report Notion Save` live 검증

## 1. 한눈에 보는 결론

- 기준일
- 전체 위험 단계
- 지난주 대비
- 핵심 변화 최대 3개
- 우선 점검할 테마 최대 3개
- 권장 행동

## 2. 주요 지표 현황

Phase A의 `facts.indicators`는 MVP 6개를 정확히 보존한다. Phase B에서는 이 facts를 다음 사용자 표로 렌더링한다.

시장가격형 5개:

- 지표명, 현재값, 실제 관측일, 1주 변화와 기준일, 4주 변화와 기준일, 단위, 상태, deterministic fact note

Core PCE:

- 최신 전월비, 이전 전월비, 최근 3개월 평균, consensus 또는 `—`, 관측일, 기준월, 상태, deterministic fact note

표시 문자열을 AI output에 두지 않는다. Phase B renderer가 raw facts를 지표별 정밀도 정책으로 포맷하며, `null`은 `—`로 표시한다. 이번 Phase A에서는 기존 Markdown/Notion 사용자 본문 구조를 최소 호환으로 유지한다.

## 3. 이번 주 매크로 판단

- 위험의 성격
- 지표 간 방향 일치 여부
- 일시적/지속적 변화
- 상충 신호
- 판단 신뢰도

위험 성격:
- 인플레이션
- 경기둔화
- 유동성·위험회피
- 특정 자산 고유 사건
- 복합 신호

## 4. 영역별 위험도

| 영역 | 점수 | 등급 | 지난주 대비 | 핵심 이유 |
|---|---:|---|---|---|

## 5. 포트폴리오 테마별 취약도

기본적으로 상위 3개 테마만 표시한다.

예외:
- 4위 테마가 3위와 점수가 거의 같고 성격이 완전히 다른 위험이면 `추가 주의` 한 줄로만 표시할 수 있다.
- 개별 종목은 중요한 공시, 실적, 기업 고유 사건, 테마 내 이례적 움직임이 있을 때만 보조로 언급한다.

각 테마에 포함할 항목:
- 테마
- 포함 자산
- 비중
- 취약도
- 등급
- 핵심 이유 최대 2개
- 행동 제안 1개

필수 고지:

> 취약도는 현재 매크로 환경에 대한 노출 정도이며, 기대수익률이나 직접적인 매도 신호가 아니다.

## 6. 헷지 및 방어 테마

먼저 헷지 필요성을 판정한다.

헷지 필요성 단계:
- 없음
- 낮음
- 보통
- 높음

출력 규칙:
- 없음 또는 낮음: 별도 헷지 추천을 생략하고, 필요하면 현금 유지 등 한 줄만 표시한다.
- 보통: 헷지 테마 1개만 제안한다.
- 높음: 헷지 테마 1~2개를 제안한다.

헷지 필요성 판단 시 고려:
- 전체 위험 단계
- 상위 취약 테마 3개의 평균 취약도
- 위험 신호 지속 기간
- 고위험 자산 비중
- 현금성 자산 비중
- 금리·인플레이션·위험선호의 동시 악화 여부

허용 테마 크기:
- 원자재
- 금
- 단기채
- 장기채
- 가치주
- 성장주
- 기술주
- 바이오주
- 조선주
- 금융주
- 현금

추천이 필요한 경우 각 테마에 포함할 항목:
- 적합 이유
- 실패 조건
- 포트폴리오 중복
- 현금 유지와 비교

특정 종목 추천은 기본적으로 하지 않는다.
헷지를 위해 불필요한 매매를 유도하지 않는다.

## 7. 다음 주 확인사항

- 예정 지표
- 연준·정책 일정
- 위험 강화 조건
- 위험 완화 조건
- 기본 시나리오 무효화 조건

입력에 없는 예정 지표나 정책 일정을 추측해서 추가하지 않는다.

## 8. 판단 기록

- 기본 시나리오
- 신뢰도
- 지난주 수정사항
- 사후 확인 항목

## 표현 제한

허용:
- 유지
- 신규매수 신중
- 신규매수 보류
- 비중 확대 중단
- 투자 가설 재확인
- 축소 검토
- 헤지 검토

금지:
- 무조건 매도
- 전량 정리
- 반드시 상승·하락
- 확실한 매수
