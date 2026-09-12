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
- 숫자, 점수, 등급, 임계값을 계산하거나 재판정하지 않는다. 표시 formatter는 raw number를 문자열로 바꾸기만 한다.
- overall/area/theme의 canonical 숫자·상태·이름과 indicator actual data는 `facts`에서만 읽는다.
- area/theme 설명과 행동은 facts ID에 연결된 `analysis`에서만 읽는다.
- indicator는 원본 배열을 변경하지 않고 `reportPriority` 오름차순으로 복사 정렬한다.
- 핵심 변화와 취약 테마는 각각 최대 3개, 헷지 후보는 최대 2개만 표시한다.
- nullable fact는 `—`로 표시한다. source exact-set 누락은 upstream validation 실패이며 renderer가 placeholder 행을 만들지 않는다.
- 실제 개인 보유 수량, 평가금액, 계좌별 비중 필드는 렌더링하지 않는다.

MVP 필수 섹션:

1. 한눈에 보는 전체 상태
2. 핵심 지표 데이터 현황
3. 영역별 위험과 AI 해석
4. 포트폴리오 취약 테마
5. 대응 및 다음 주 확인 조건
6. 경고 및 주의 문구

### 표시 formatter

- null/undefined/non-finite: `—`
- 미국 2년물 수준: 소수점 2자리와 `%`
- 미국 2년물 변화: 소수점 1자리와 `bp`, 양수 `+`
- WTI: 소수점 1자리
- USD/KRW: 천 단위 separator와 소수점 1자리
- Bitcoin: 천 단위 separator와 정수
- S&P 500: 천 단위 separator와 소수점 1자리
- Core PCE: 소수점 2자리와 `% MoM`
- 일반 변화율: 소수점 1자리와 양수 `+`; 1자리 반올림이 non-zero raw 변화를 0.0으로 만들면 2자리
- overall/area/theme score: 소수점 2자리
- 날짜: source `YYYY-MM-DD` 문자열 유지

formatter는 Markdown/Notion/Telegram 사용자 표시 경계에서만 사용한다. raw facts, 위험 판정, 정렬, consistency, Notion number property에는 formatter 결과를 사용하지 않는다.

### enhanced Markdown 표

시장가격형 5개와 Core PCE, 영역별 위험은 Notion native enhanced Markdown의 `<table fit-page-width="true" header-row="true">`, `<tr>`, `<td>` 형식으로 렌더링한다. 표 내부는 tab indentation을 사용한다. GFM pipe table과 `|---|` separator는 생성하지 않는다. 이 하나의 Markdown을 artifact/GitHub preview와 Notion native Markdown create/replace에 함께 사용한다.

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
`Overall Score` number property는 `facts.overallRisk.score` raw 값을 저장한다. 소수점 2자리 정책은 본문 표시 문자열에만 적용한다.

### 생성 및 갱신

- 저장 전 `Report Key`로 data source를 조회한다.
- 일치 page가 없으면 Markdown 본문과 properties로 새 page를 생성하고 결과를 `created`로 기록한다.
- 일치 page가 하나면 properties를 갱신하고 Markdown 본문 전체를 `replace_content`로 교체하며 결과를 `updated`로 기록한다.
- 일치 page가 둘 이상이면 임의 page를 선택하지 않고 `NOTION_DUPLICATE_REPORT_KEY`로 실패한다.
- Notion native Markdown 입력을 사용하고 자체 Markdown-to-block 변환기는 구현하지 않는다.
- 생성과 갱신 모두 renderer가 만든 enhanced Markdown `<table>`을 그대로 사용한다.
- 저장 후 page 제목은 authoritative `Name` property로 검증한다. Markdown 본문은 존재·비절단·기준일·주의 문구, 핵심 지표 섹션, facts의 MVP 6개 지표명, Core PCE 관측일·기준월 표현, GFM separator와 placeholder table row 부재를 검증하며 첫 H1의 동일 문자열 round-trip은 요구하지 않는다.
- 검증 실패 메시지는 `markdown.indicator.btc` 같은 coverage key만 포함하고 전체 Markdown이나 page 원문을 로그에 남기지 않는다.

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
7. 저장 후 properties, 핵심 지표 6개 coverage, Core PCE 날짜 표현, placeholder 부재 read-back 검증 성공
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

## 0-3. Telegram data-first 출력 계약

- 정상 메시지 순서: 머리말 → 기준일·색상 표식이 붙은 전체 위험 단계·정수 보조점수·신뢰도 → 중요 실제 지표 → AI 판단 최대 3개 → 취약 테마 최대 3개 → 권장 대응 → Notion 안내·주의 문구
- `facts.indicators`에서 최대 3개를 선택한다. status 순서는 `strong_alert > alert > watch > normal > easing > unavailable`이다.
- 같은 status는 raw `riskContribution` 내림차순, `reportPriority` 오름차순, `indicatorId` 사전순으로 정렬한다. null 기여도는 숫자보다 뒤에 두며 음수를 0으로 바꾸지 않는다. source 배열은 변경하지 않는다.
- 시장가격형: 이름·단위 포함 현재값·관측일, 다음 줄에 1주·4주 변화와 status를 표시한다.
- Core PCE: 최신 전월비·관측일, 다음 줄에 이전 전월비·최근 3개월 평균과 status를 표시한다. 관측일을 발표일로 부르지 않는다. 나머지 상세 데이터는 Notion에서 확인한다.
- actual value와 변화는 Phase B 공용 formatter를 그대로 재사용하고 nullable field는 `—`로 표시한다.
- Telegram `sendMessage` HTML은 글자색을 지정하지 않으므로 상태를 `🔵 완화`, `🟢 정상`, `🟡 주의`, `🟠 경계`, `🔴 강한 경계/높은 위험`, `⚪ 사용 불가`와 canonical code로 표시한다.
- overall raw score는 위험 단계를 결정하는 값이 아니라 영역 가중평균 보조값이므로 Telegram에서 반올림한 정수 `n/3 (높을수록 위험)`로 표시한다. 판정과 정렬에는 raw score를 계속 사용한다.
- theme score는 노출도 합산값이라 고정 상한이 없으므로 Telegram에서는 숫자를 생략하고 색상 표식·한글 label·canonical level로 표시한다. 상세 raw score는 Notion 보고서에서 확인한다.
- AI 설명은 analysis에서, 지표 선택·수치·상태와 테마 name/level은 facts에서만 읽는다.
- 동적 문자열 HTML escape, 한 메시지, 보이는 텍스트 3,500자 상한을 유지한다. 길이 초과 시 AI 설명 등 선택 문구부터 축약하며 선택 지표의 수치·날짜는 자르지 않는다. 그래도 초과하면 `TELEGRAM_SUMMARY_TOO_LONG`으로 실패한다.
- Notion `verified === true` 이후에만 정상 Telegram을 전송한다. shouldAbort 품질 실패 분기, 중복 전송 허용, Secret·본문·원문 응답 비로그 정책은 유지한다.
- 실제 완료 검증은 main의 `Manual Weekly Report Telegram Notification`을 실행해 `weekly`, `verified: true`, `status: sent`와 실제 한 메시지 수신·지표 수치 표시를 확인한다.

## 1. 한눈에 보는 전체 상태

- 기준일과 생성시각
- `facts.overallRisk`의 canonical level과 사람이 읽는 label 병기
- `facts.overallRisk.score`의 소수점 2자리 표시
- `facts.overallRisk.confidence`
- `analysis.oneLookAnalysis.recommendedAction`

## 2. 핵심 지표 데이터 현황

`facts.indicators`의 MVP 6개를 `reportPriority` 오름차순으로 표시한다.

시장가격형 5개 표:

- 지표명
- 단위를 포함한 현재값
- 실제 관측일
- 1주 변화와 비교 기준일
- 4주 변화와 비교 기준일
- 상태
- deterministic fact note

Core PCE 별도 표:

- 최신 전월비
- 이전 전월비
- 최근 3개월 평균 전월비
- consensus 또는 `—`
- 관측일
- 기준월
- 상태
- deterministic fact note

Core PCE `currentObservationDate`는 `관측일`로만 표현하며 실제 발표일로 부르지 않는다. 표시 문자열은 AI output에 두지 않는다.

## 3. 영역별 위험과 AI 해석

`facts.areaRisks`와 `analysis.areaInsights`를 `areaId`로 결합한다.

- 영역명·score·status: facts
- key reason: analysis
- score는 소수점 2자리 표시

표 뒤에 위험 성격, 요약, 방향 일치 여부, 핵심 변화와 상충 신호를 analysis에서 표시한다. 일반 AI 분석은 핵심 지표 facts 표보다 앞에 배치하지 않는다.

## 4. 포트폴리오 취약 테마

`facts.portfolioThemes` 상위 최대 3개와 `analysis.themeInsights`를 `themeId`로 결합한다.

- 테마명·score·level: facts
- key reasons 최대 2개·action: analysis
- score는 소수점 2자리 표시
- 기본 본문에서는 `macroContributions` raw 상세를 노출하지 않음

필수 고지:

> 취약도는 현재 매크로 환경에 대한 노출 정도이며, 기대수익률이나 직접적인 매도 신호가 아니다.

## 5. 대응 및 다음 주 확인 조건

- `analysis.hedgeAndDefense`: 필요성, 요약, 후보 최대 2개와 적합 이유·실패 조건·현금 비교
- `analysis.nextWeekChecklist`: 예정 지표, 위험 강화·완화 조건, 기본 시나리오 무효화 조건
- `analysis.decisionLog`: 기본 시나리오와 사후 확인 항목

입력에 없는 예정 지표나 정책 일정을 추측해서 추가하지 않는다. 특정 종목 추천을 기본적으로 하지 않고 불필요한 매매를 유도하지 않는다.

## 6. 경고 및 주의 문구

- code-owned `warnings`; 없으면 `해당 없음`
- code-owned `presentation.mandatoryDisclosure`
- Secret, 실제 보유 수량, 평가금액, 계좌별 비중은 포함하지 않음

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
