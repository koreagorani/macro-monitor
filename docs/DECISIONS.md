# Decisions

## D-001 영역별 위험 모델

결정:
- 단순 경고 개수 합산이 아니라 영역별 위험 모델을 사용한다.

이유:
- 지표 추가 시 전체 점수 체계를 뒤엎지 않기 위해서다.

## D-002 숫자와 AI 분리

결정:
- 숫자 판정은 코드, 해석은 AI가 담당한다.

이유:
- AI가 임계값을 자의적으로 바꾸는 것을 막는다.

## D-003 테마 단위 포트폴리오 분석

결정:
- 보고서는 개별 종목보다 테마별 취약도를 우선 출력한다.

이유:
- 종목 수가 늘어도 보고서 복잡도를 제한한다.
- 포트폴리오 변경에도 모델을 유지한다.

## D-004 약한 비중 반영

결정:
- 보유 비중은 구간별 보정계수로 약하게 반영한다.

이유:
- 큰 비중 종목이 항상 취약도 1위가 되는 것을 막는다.

## D-005 취약도 의미

결정:
- 취약도는 기대수익률이나 매도 신호가 아니라 매크로 노출도다.

## D-006 지표 코멘트

결정:
- 모든 지표를 해설하지 않고 특이사항이 있을 때만 코멘트한다.

이유:
- 보고서 지면과 독서 시간을 줄인다.

## D-007 헷지 필요성 및 추천 개수

결정:
- 헷지는 특정 종목보다 테마 단위로 제안한다.
- 헷지 필요성을 먼저 판정한다.
- 필요성 없음·낮음이면 추천을 생략한다.
- 필요성 보통이면 1개, 높음이면 1~2개만 제안한다.

이유:
- 헷지를 위한 불필요한 매매를 막는다.
- 현재 포트폴리오의 현금 비중과 실제 위험 수준을 반영한다.

## D-008 문서 라우팅

결정:
- 모든 작업에서 모든 문서를 읽지 않는다.
- `AGENTS.md`가 작업별 필수 문서를 지정한다.

이유:
- 컨텍스트 낭비와 문서 간 혼선을 줄인다.

## D-009 취약 테마 출력 개수 제한

결정:
- 포트폴리오 취약 테마는 기본적으로 상위 3개만 표시한다.
- 4위는 3위와 점수가 유사하고 위험 성격이 다를 때만 보조적으로 표시한다.
- 헷지 출력 규칙은 D-007을 따른다.

이유:
- 보고서를 5분 안에 읽을 수 있도록 정보 밀도를 제한한다.
- 사용자가 우선 점검할 대상을 명확히 하기 위해서다.

## D-010 근원 PCE 비교 방식

결정:
- 근원 PCE는 월간 발표형 지표로 처리한다.
- 이전 발표치와 3개월 추세를 기본 비교 기준으로 사용한다.
- 시장 예상치는 신뢰할 수 있는 출처가 확보된 경우에만 보조적으로 사용한다.

이유:
- 월간 발표 지표에 전주 대비와 4주 누적 변화율을 적용하면 실제 발표 주기와 맞지 않는다.
- 발표 간 추세를 일관된 방식으로 비교하기 위해서다.

## D-011 운영 데이터와 개인 보고서 비보관

결정:
- 운영 원시 시계열과 개인 최종 보고서는 공개 저장소에 보관하지 않는다.
- 공개 저장소에는 코드, 설정, 임계값, 문서, 비민감 샘플 스키마, 테스트 고정 데이터와 예시 파일을 보관할 수 있다.
- 원시 데이터의 일시 처리와 폐기 방식은 `docs/ARCHITECTURE.md`를 따른다.

이유:
- 데이터 재배포 및 장기 보관과 관련된 제약을 줄이기 위해서다.
- 공개 저장소에 개인 분석 결과와 불필요한 운영 데이터를 남기지 않기 위해서다.

## D-012 Notion 연동 전 보고서 출력

결정:
- Notion 연동 전에는 생성된 보고서를 수동 실행 화면에만 출력한다.
- 이 단계에서는 보고서를 저장소에 커밋하거나 장기 보관하지 않는다.

이유:
- 자동 저장 경로가 확정되기 전에도 결과를 검증할 수 있어야 한다.
- 개인 보고서가 공개 저장소에 남는 것을 방지하기 위해서다.

## D-013 문서 역할과 단일 출처

결정:
- 문서별 책임 범위는 `AGENTS.md`의 문서 역할 정의를 따른다.
- 같은 규칙의 상세 내용을 여러 문서에 중복 작성하지 않는다.
- 다른 문서에서는 필요한 수준으로 요약하거나 담당 문서를 참조한다.

이유:
- 한 규칙을 수정할 때 여러 문서가 서로 다른 상태로 남는 문제를 방지하기 위해서다.
- 작업 세션이 필요한 문서만 읽고도 일관된 결론에 도달하도록 하기 위해서다.

## D-014 지표 설정과 정규화 출력 계약

결정:
- 지표별 수집·계산·표시 설정의 단일 출처는 `config/indicators.json`으로 한다.
- 수집 결과의 공통 계약은 `data/schema/indicator-output.schema.json`으로 한다.
- 시장가격형과 정기발표형은 공통 필드를 공유하고 유형별 `metrics`를 분리한다.
- 계산값은 원래 정밀도를 유지하고 보고서 표시 단계에서만 반올림한다.
- 합성 예시는 `data/examples/`에 보관한다.

이유:
- 데이터 수집 코드와 위험모델 사이의 입력 계약을 명확히 하기 위해서다.
- 실제 시장 데이터를 저장하지 않고도 스키마와 구현을 검증하기 위해서다.

## D-015 Phase 3 구현 언어와 실행 환경

결정:
- Phase 3 MVP는 Node.js 22 이상의 JavaScript ES Modules로 구현한다.
- JSON Schema 검증에는 Ajv를 사용한다.
- 테스트는 Node.js 내장 `node:test`를 사용한다.
- GitHub Actions와 수동 명령은 동일한 실행 코드를 호출한다.

이유:
- 별도 빌드 단계 없이 브라우저 중심 개발 환경과 GitHub Actions에서 실행할 수 있다.
- 현재 MVP 규모에서는 TypeScript 빌드 체계보다 단순한 실행과 디버깅이 우선이다.
- 향후 타입 안정성이 더 필요해지면 TypeScript 전환을 별도 결정으로 검토할 수 있다.

## D-016 Phase 4 핵심 지표 범위

결정:
- 보고서 생성 중단 판단에 사용하는 핵심 지표는 `us2y`, `core_pce`, `wti`, `usdkrw`, `sp500`으로 한다.
- `btc`는 MVP 지표이지만 핵심 지표 중단 조건에는 포함하지 않는다.
- `btc` 실패 시 보고서는 계속 생성하되 위험선호와 암호자산 관련 신뢰도를 낮춘다.

이유:
- 핵심 지표는 주요 매크로 영역의 최소 커버리지를 보장하기 위한 기준이다.
- `btc`는 위험선호 보조 지표와 포트폴리오 민감도 판단에는 유용하지만, 단독 실패만으로 전체 매크로 보고서를 중단할 정도의 기반 지표는 아니다.

## D-017 핵심 지표 실패 중단 위치

결정:
- 개별 데이터 수집기는 지표 실패를 격리해 `available: false` 정규화 객체를 반환한다.
- 핵심 지표 2개 이상 실패 시 중단 판단은 데이터 수집기 내부가 아니라 수집 완료 후 위험점수 계산 전의 품질 게이트에서 수행한다.
- 핵심 지표 1개 실패 또는 비핵심 지표 실패는 보고서를 계속 생성하되 신뢰도 하향 신호로 전달한다.

이유:
- 수집 단계의 책임은 가능한 모든 지표를 독립적으로 수집하고 실패를 구조화하는 것이다.
- 보고서 중단 여부는 전체 입력 품질을 본 뒤 결정해야 한다.
- 이후 위험점수 계산과 보고서 생성에서 동일한 품질 정보를 재사용할 수 있다.

## D-018 의존성 버전 고정

결정:
- `package-lock.json`은 Phase 4 코드 구현 전에 생성해 커밋한다.
- lockfile은 사람이 직접 작성하지 않고 `npm install`이 생성한 결과를 사용한다.

이유:
- GitHub Actions와 향후 로컬 실행에서 동일한 의존성 버전을 재현하기 위해서다.
- 수동으로 lockfile을 작성하면 실제 npm 해석 결과와 어긋날 수 있다.

## D-019 전체 위험 단계 판정 우선순위

결정:
- `overallRisk.level`은 discrete rule을 우선 적용해 판정한다.
- 영역 weight 기반 `overallRisk.score`는 보조 점수로 사용하고 level을 단독으로 덮어쓰지 않는다.
- weighted score와 discrete rule이 충돌하면 discrete rule을 우선한다.

이유:
- 전체 위험 단계는 단순 평균보다 영역 조합과 동시 악화 여부가 더 중요하다.
- score는 추세 비교와 보조 판단에는 유용하지만, MVP 단계에서 단독 판정 기준으로 쓰기에는 운영 검증 데이터가 부족하다.

## D-020 Phase 5 포트폴리오 계약 파일명

결정:
- Phase 5 포트폴리오 취약도 모델의 단일 문서는 `docs/PORTFOLIO.md`로 한다.
- 테마 민감도 설정은 `config/portfolio-themes.json`으로 한다.
- 헷지 후보 설정은 `config/hedge-candidates.json`으로 한다.
- 기존 라우팅에서 언급하던 `docs/PORTFOLIO_MODEL.md`, `config/portfolio.json`, `config/theme-exposures.json` 명칭은 사용하지 않는다.

이유:
- 사용자 지시와 실제 Phase 5 준비 파일명을 일치시키기 위해서다.
- 테마 민감도와 실제 개인 포트폴리오 입력을 분리하기 위해서다.

## D-021 공개 저장소의 포트폴리오 데이터 범위

결정:
- 공개 저장소에는 일반적 테마 정의, 매크로 민감도, 헷지 후보, 합성 예시만 보관한다.
- 실제 개인 보유 종목별 수량, 평가금액, 계좌별 비중, 최종 개인 보고서는 공개 저장소에 커밋하지 않는다.
- Phase 5 첫 구현에서는 테마 취약도 모델을 먼저 만들고, 실제 보유 비중은 추후 비공개 입력으로 연결한다.

이유:
- 포트폴리오 취약도 모델은 공개 가능한 구조와 개인 데이터를 분리해야 한다.
- 공개 저장소에 개인 투자 정보가 남는 것을 방지하기 위해서다.

## D-022 Phase 5 취약도 점수와 출력 범위

결정:
- 테마 취약도 점수는 `areaRisk.score × theme.macroExposures[areaId]`의 합으로 계산한다.
- 음수 기여도와 음수 최종 점수는 0으로 강제 보정하지 않고 `easing` 신호로 보존한다.
- Phase 5 MVP 출력은 D-009에 따라 score 기준 상위 3개 enabled 테마로 제한한다.
- 헷지 후보 ID는 테마 취약도 level이 `watch` 이상일 때만 연결한다.

이유:
- 음수 노출은 방어 또는 완화 가능성을 나타낼 수 있어 손실 없이 보존해야 한다.
- 초기 보고서에서는 사용자가 우선 점검할 상위 취약 테마를 제한하는 것이 더 유용하다.
- normal/easing 테마에 헷지 후보를 붙이면 불필요한 행동 신호로 오해될 수 있다.

## D-023 통합 매크로 리뷰 실행 경로

결정:
- live 통합 실행 명령은 `npm run evaluate:macro-review -- YYYY-MM-DD`로 한다.
- 이 명령은 실제 FRED 기반 `riskOutput`을 생성한 뒤, 같은 실행 안에서 `portfolioVulnerability`를 계산하고 `macro-review` 통합 JSON을 출력한다.
- 통합 출력의 단일 계약은 `data/schema/macro-review-output.schema.json`으로 한다.
- `riskOutput.quality.shouldAbort === true`이면 `portfolioVulnerability`는 `null`로 두고 통합 warning을 생성한다.
- `riskOutput.quality.confidence === "reduced"`이면 포트폴리오 계산은 계속하되 통합 warning을 생성한다.

이유:
- 보고서 생성 전 단계에서 데이터 수집, 위험 모델, 포트폴리오 취약도 모델이 한 번의 실행으로 연결되는지 검증해야 한다.
- 중단 조건과 신뢰도 하향 조건을 통합 출력에서 명시해야 이후 AI 보고서가 같은 계약을 안정적으로 읽을 수 있다.

## D-024 AI 주간 보고서 출력 계약

결정:
- AI 보고서 생성의 단일 입력은 `macro-review` JSON으로 한다.
- AI 보고서 생성의 단일 출력 계약은 `data/schema/weekly-report-output.schema.json`으로 한다.
- AI는 자유 형식 Markdown이 아니라 schema 검증 가능한 weekly-report-output JSON을 반환한다.
- Markdown, Notion, Telegram 출력은 weekly-report-output JSON을 렌더링하는 후속 단계에서 처리한다.
- AI는 숫자, 위험 등급, 취약도 점수, 임계값을 재계산하거나 변경하지 않는다.

이유:
- AI가 숫자 판정과 임계값을 자의적으로 바꾸는 것을 방지하기 위해서다.
- 구조화 출력으로 검증해야 후속 Notion·Telegram 렌더링을 안정적으로 연결할 수 있다.
- 보고서 문장화와 숫자 계산 책임을 분리하기 위해서다.

## D-025 AI 주간 보고서 생성 실행 경로

결정:
- AI 주간 보고서 생성 명령은 `npm run generate:weekly-report -- YYYY-MM-DD`로 한다.
- 이 명령은 실제 FRED 기반 macro-review 숫자 파이프라인을 실행한 뒤 OpenAI API를 호출해 weekly-report-output JSON을 생성한다.
- OpenAI API 키는 `OPENAI_API_KEY` 환경변수 또는 GitHub Secret으로만 전달한다.
- 기본 모델은 `OPENAI_MODEL`이 없으면 `gpt-4.1`을 사용한다.
- OpenAI 호출은 JSON mode(`text.format.type = "json_object"`)로 요청한다.
- OpenAI 원문 응답 전체와 API 키는 로그에 남기지 않는다.
- AI 응답은 JSON 파싱, weekly-report-output schema 검증, macro-review 원본과의 consistency 검증을 모두 통과해야 한다.
- consistency 검증에서는 `overallLevel`, `overallScore`, `confidence`, 상위 테마 ID, 영역별 score/status, 테마별 score/level을 입력과 비교한다.

이유:
- 자연어 보고서는 AI가 담당하되, 숫자·등급·점수는 코드 산출물에서 벗어나지 않도록 하기 위해서다.
- JSON mode를 사용해 코드펜스나 설명문이 섞여 JSON 파싱이 실패할 위험을 낮추기 위해서다.
- 후속 Markdown/Notion/Telegram 렌더링 전에 구조화 보고서 JSON의 신뢰성을 확보해야 한다.
- API 키와 원문 응답을 로그에 남기지 않아 운영 보안을 유지하기 위해서다.

## D-026 AI 주간 보고서 Structured Outputs 적용

결정:
- OpenAI Responses API 호출은 기존 JSON mode(`text.format.type = "json_object"`) 대신 Structured Outputs(`text.format.type = "json_schema"`, `strict: true`)를 사용한다.
- 단일 출력 계약인 `data/schema/weekly-report-output.schema.json`을 API 요청의 schema로 전달한다.
- API의 strict schema 강제 이후에도 로컬 weekly-report-output schema 검증과 macro-review consistency 검증을 최종 안전장치로 유지한다.
- OpenAI API 요청용 schema에서는 문서 식별용 `$schema`, `$id` 메타데이터만 제거하고 실제 출력 계약은 변경하지 않는다.

이유:
- JSON mode는 유효한 JSON만 보장하며 필드명, 필수 필드, 중첩 구조까지 보장하지 않는다.
- run `29189631808`에서 OpenAI 호출은 성공했지만 AI 출력이 weekly-report-output 필드 계약과 달라 로컬 schema 검증에서 실패했다.
- Structured Outputs로 API 단계부터 출력 구조를 강제해 반복적인 schema 불일치 실패를 줄이기 위해서다.
- 숫자·등급 변조 방지는 schema 준수만으로 충분하지 않으므로 기존 consistency 검증을 계속 유지해야 한다.

## D-027 weekly-report-output 기반 Markdown 렌더링

결정:
- Markdown 렌더링의 단일 입력은 검증을 통과한 weekly-report-output JSON으로 한다.
- 렌더러는 AI나 외부 API를 호출하지 않는 순수 동기 함수로 구현한다.
- 실제 live 실행 명령은 기존 FRED → macro-review → OpenAI weekly-report-output 파이프라인을 재사용한 뒤 Markdown을 렌더링한다.
- 기본 출력은 stdout으로 하고, `REPORT_MARKDOWN_OUTPUT`이 지정된 경우에만 해당 임시 경로에 파일을 쓴다.
- GitHub Actions의 전체 Markdown은 저장소에 커밋하지 않고 7일 보관 artifact로만 제공하며 로그에는 앞부분 preview만 출력한다.

이유:
- 숫자 판정, AI 문장화, 채널별 표현을 분리해 Notion과 Telegram에서도 같은 구조화 출력을 재사용하기 위해서다.
- 순수 렌더러는 AI 재호출 없이 결정론적으로 테스트할 수 있다.
- 공개 저장소에 개인 운영 보고서가 남는 것을 방지하면서 실제 결과물을 검증할 수 있어야 한다.

## D-028 Notion 주간 보고서 저장 계약

결정:
- MVP Notion 저장 대상은 주간 보고서 archive database의 data source로 한다.
- page 생성 parent에는 최신 Notion API의 `data_source_id`를 사용한다.
- 사람이 읽는 Markdown을 page 본문으로 저장하고 weekly-report-output 전체 JSON은 중복 저장하지 않는다.
- 검색·정렬·검증에 필요한 기준일, 생성시각, 전체 위험 단계·점수, 신뢰도, schema version, Report Key만 page properties로 저장한다.
- `Report Key = weekly-report:{asOf}`로 upsert하며 같은 기준일의 중복 page 생성을 막는다.
- 기존 page는 properties 갱신과 native Markdown `replace_content`로 전체 본문을 교체한다.
- Notion API version은 `2026-03-11`을 기본값으로 고정하고 명시적 호환성 검증 없이 자동 변경하지 않는다.
- 최신 Notion API의 native Markdown 입력을 사용하므로 자체 Markdown-to-block parser는 MVP에서 구현하지 않는다.
- `NOTION_API_KEY`와 `NOTION_DATA_SOURCE_ID`는 GitHub Secrets에서만 읽는다.

이유:
- database/data source 방식은 주간 보고서를 날짜·위험 단계별로 검색하고 정렬하기 쉽다.
- Markdown 본문과 최소 properties 조합이 사람 중심 archive 목적을 충족하면서 데이터 중복을 줄인다.
- Report Key upsert는 Actions 재실행으로 같은 기준일의 보고서가 중복 생성되는 것을 막는다.
- Notion native Markdown 변환을 사용하면 자체 parser의 포맷 손실과 유지보수 부담을 피할 수 있다.
- 공개 저장소와 로그에 개인 보고서, workspace 식별자, 인증정보가 남지 않도록 하기 위해서다.

## D-029 Telegram 주간 알림 전송 계약

결정:

- Notion을 전체 주간 보고서의 원본으로 두고 Telegram은 핵심 요약과 경고만 전달하는 확인용 채널로 사용한다.
- 정상 알림은 검증된 weekly-report-output만 렌더링하며 숫자·위험 단계·임계값을 다시 계산하지 않는다.
- `quality.shouldAbort === true`이면 AI 보고서와 Notion 저장 대신 macro-review quality 기반 데이터 품질 실패 알림만 보낸다.
- 정상 주간 보고서는 위험 단계와 관계없이 한 메시지를 보내고, `alert`와 `high_risk`는 같은 메시지의 경고 머리말로 구분한다.
- 메시지는 `HTML` parse mode, 보이는 텍스트 최대 3,500자, 동적 문자열 escape를 적용하고 MVP에서는 분할하지 않는다.
- Notion page 직접 링크는 MVP 메시지에 포함하지 않고 전체 보고서 위치를 고정 문구로만 안내한다.
- 정상 알림은 Notion 저장 성공 뒤에 전송하며 Telegram 실패가 Notion 저장을 되돌리지 않는다.
- Telegram Bot API가 idempotency key를 제공하지 않으므로 MVP에서는 재실행 중복을 허용한다. 논리적 delivery key는 정의하되 영속 저장과 exactly-once 보장은 후속 결정으로 남긴다.
- `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`는 GitHub Secrets에서만 읽으며 token, chat ID, 메시지 본문, 원문 API 응답은 로그에 남기지 않는다.

이유:

- 긴 전체 보고서는 검색·보관이 가능한 Notion에 두고 Telegram의 읽기 시간을 짧게 유지하기 위해서다.
- 데이터 품질 중단 시 계산되지 않은 위험 정보가 알림에서 만들어지는 것을 막아 숫자 판정과 채널 렌더링 책임을 분리하기 위해서다.
- 한 메시지와 보수적 길이 상한은 Telegram 제한에 여유를 두고 분할 메시지의 순서·부분 실패 문제를 피한다.
- 직접 Notion 링크를 제외하면 workspace 식별자와 개인 page URL이 제3자 채널과 로그로 확산될 가능성을 줄일 수 있다.
- 영속 delivery 상태가 없는 MVP에서 exactly-once를 가장하면 전송 성공 후 응답 유실 같은 경우를 안전하게 처리할 수 없으므로 중복 가능성을 명시하는 편이 정확하다.
- Notion 저장과 Telegram 전송을 비원자적으로 분리하면 알림 장애가 이미 보관된 전체 보고서를 훼손하지 않는다.

