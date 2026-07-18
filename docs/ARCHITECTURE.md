# Architecture

## 흐름

```text
데이터 API
→ 원시 데이터 임시 조회
→ 정규화
→ 변화 계산
→ 지표 상태
→ 이례성
→ 영역 위험
→ 테마 취약도
→ AI 해석
→ 보고서
→ Notion
→ 경고
→ Telegram
```

## 원칙

- 수집과 판단 분리
- 판단과 AI 해석 분리
- 포트폴리오와 민감도 분리
- 임계값은 설정 파일
- 수동 실행 가능
- 오류 시 보고서 생성 중단 또는 신뢰도 하향
- 원시 시계열은 실행 중에만 사용하고 장기 보관하지 않음
- 공개 저장소에는 운영 원시 시계열과 개인 보고서를 보관하지 않음

## 실행 환경

- Node.js 22 이상
- JavaScript ES Modules
- GitHub Actions와 수동 명령에서 동일한 실행 코드를 사용
- JSON Schema 검증은 Ajv를 사용
- 테스트는 Node.js 내장 `node:test`를 사용

## 데이터 처리 및 보관

- GitHub Actions 실행 시 필요한 기간의 데이터만 API에서 조회한다.
- 원시 시계열은 메모리 또는 임시 파일에서만 처리한다.
- 시장가격형은 기준일, 7일 전, 28일 전 이하의 가장 최근 유효 관측값을 사용한다.
- 미국 2년물 변화는 bp 차이로 계산하고 나머지 시장가격형 변화는 백분율로 계산한다.
- 근원 PCE는 지수 수준에서 전월비와 최근 3개월 전월비 평균을 계산한다.
- 계산이 끝나면 원시 시계열을 폐기한다.
- 비트코인과 S&P 500의 전체 원시 시계열을 공개 저장소에 장기간 저장하거나 커밋하지 않는다.
- 운영 원시 시계열과 개인 최종 보고서는 공개 저장소에 커밋하지 않는다.
- 코드, 설정, 임계값, 문서, 데이터 스키마, 합성 테스트 데이터와 비민감 예시 파일은 공개 저장소에 보관할 수 있다.

## 정규화 출력 계약

- 지표 설정의 단일 출처는 `config/indicators.json`이다.
- 수집 결과의 공통 JSON 계약은 `data/schema/indicator-output.schema.json`이다.
- 위험 모델 출력 계약은 `data/schema/risk-output.schema.json`이다.
- 포트폴리오 취약도 출력 계약은 `data/schema/portfolio-vulnerability-output.schema.json`이다.
- 합성 예시는 `data/examples/`에 둔다.
- `asOf`는 수집 실행의 기준일이다.
- 실제 계산에 사용한 관측일은 유형별 `metrics`에 별도로 저장한다.
- 계산값은 원래 정밀도를 유지하고 표시 단계에서만 반올림한다.

## 소스 구조

```text
src/
├─ clients/       # 외부 API 호출
├─ collectors/    # 지표별 수집 오케스트레이션과 실패 격리
├─ config/        # JSON 설정 로딩
├─ domain/        # 관측값 선택과 순수 계산 함수
├─ portfolio/     # 포트폴리오 테마 취약도 계산
├─ risk/          # 지표·영역·전체 위험 판정
└─ validation/    # JSON Schema 검증

scripts/          # 수동 실행 진입점
test/             # 합성 데이터 기반 단위 테스트
```

- 외부 API 응답 처리와 계산 로직을 분리한다.
- `domain/`, `risk/`, `portfolio/`의 순수 계산 함수는 네트워크나 환경변수에 의존하지 않는다.
- 실행 스크립트는 설정 로딩, 수집, 검증, 화면 출력을 연결한다.

## 보고서 전달 경로

- Notion 연동 전에는 생성된 보고서를 수동 실행 화면에만 출력한다.
- 이 단계에서는 보고서 파일을 저장소에 커밋하거나 장기 보관하지 않는다.
- Notion 연동 후에는 최종 보고서를 개인 Notion 데이터베이스로 전송한다.
- Telegram 연동 후에는 핵심 요약과 경고만 전송한다.

## Notion 저장 아키텍처

MVP의 Notion 저장 대상은 주간 보고서 아카이브용 database 안의 단일 data source다. 최신 Notion API에서는 database가 하나 이상의 data source를 담는 컨테이너이므로 page 생성 parent에는 `data_source_id`를 사용한다.

저장 흐름:

```text
검증된 weekly-report-output
→ 순수 Markdown renderer
→ Notion page properties payload 생성
→ Report Key로 기존 page 조회
→ 없으면 page 생성 / 있으면 properties와 전체 Markdown 교체
→ 저장 결과 최소 검증
```

저장 내용:

- page 본문: 사람이 읽는 Markdown 보고서
- page properties: 기준일, 생성시각, 전체 위험 단계·점수, 신뢰도, schema version, Report Key
- weekly-report-output 전체 JSON: Notion에 중복 저장하지 않음
- 실제 개인 보유 수량, 평가금액, 계좌별 비중: 저장하지 않음

중복 방지:

- `Report Key = weekly-report:{asOf}`를 사용한다.
- 같은 기준일을 재실행하면 새 page를 추가하지 않고 기존 page를 갱신한다.
- 신규 저장과 갱신 결과를 `created` 또는 `updated`로 구분한다.

Notion API 계약:

- API version: `2026-03-11`
- page parent: `data_source_id`
- page 생성 시 Notion의 native `markdown` body를 우선 사용한다.
- 기존 page 갱신 시 Markdown `replace_content` 명령으로 본문 전체를 교체한다.
- 자체 Markdown-to-block parser는 MVP에서 구현하지 않는다.
- 저장 후 page properties와 page Markdown의 기준일·제목·필수 주의 문구를 최소 검증한다.

보안 및 로그:

- `NOTION_API_KEY`와 `NOTION_DATA_SOURCE_ID`는 GitHub Secrets에서만 읽는다.
- API key, data source ID, page ID, page URL, 원문 API 응답 전체를 로그에 남기지 않는다.
- 로그에는 `created|updated`, 기준일, HTTP 상태, 안전한 error code/message만 남긴다.
- Notion 대상 data source는 connection에 명시적으로 공유하고 Insert Content 및 Update Content 권한을 부여한다.

공식 API 참고:

- https://developers.notion.com/reference/post-page
- https://developers.notion.com/reference/update-page-markdown
- https://developers.notion.com/guides/data-apis/working-with-databases
- https://developers.notion.com/reference/versioning

## Telegram 알림 아키텍처

MVP에서 Notion은 전체 주간 보고서의 원본이고 Telegram은 확인용 요약·경고 채널이다. Telegram 메시지에서 수치나 위험 단계를 다시 계산하지 않는다.

정상 보고서 흐름:

```text
검증된 weekly-report-output
→ Markdown 렌더링
→ Notion 저장 및 검증 성공
→ Telegram 요약 생성
→ Telegram 전송
```

데이터 품질 중단 흐름:

```text
macro-review quality.shouldAbort 확인
→ AI 보고서 및 Notion 저장 생략
→ 데이터 품질 실패 Telegram 알림 생성·전송
```

입력과 표현:

- 정상 알림은 검증된 weekly-report-output의 기준일, 전체 위험 단계·점수, 신뢰도, 핵심 변화 최대 3개, 취약 테마 최대 3개, 권장 대응만 사용한다.
- 데이터 품질 실패 알림은 macro-review의 quality 정보만 사용하며 존재하지 않는 위험 단계·점수를 생성하지 않는다.
- Telegram Bot API의 `sendMessage`와 `parse_mode=HTML`을 사용한다.
- 태그는 렌더러가 생성하는 제한된 `<b>`만 허용하고 동적 문자열의 `&`, `<`, `>`는 HTML entity로 escape한다.
- Bot API 제한은 entity 해석 후 4,096자이지만 MVP 내부 상한은 보이는 텍스트 3,500자로 둔다.
- 핵심 변화와 테마 수, 각 동적 문구 길이를 제한하고 선택 세부내용부터 축약해 한 메시지를 유지한다. 상한을 넘은 메시지를 자동 분할하지 않는다.
- Notion page URL은 MVP 메시지에 넣지 않는다. 대신 `Notion의 Macro Weekly Reports에서 전체 보고서 확인`이라는 고정 안내만 사용한다.
- 개인 보유 수량, 평가금액, 계좌별 비중은 입력과 메시지에 포함하지 않는다.

전송 순서와 중복:

- 정상 알림은 Notion 저장 성공 뒤에 전송한다.
- Telegram 실패는 이미 성공한 Notion 저장을 되돌리지 않지만 workflow는 실패 처리해 미전송을 드러낸다.
- Telegram `sendMessage`에는 애플리케이션 idempotency key가 없으므로 MVP에서는 수동 재실행에 따른 중복 전송을 허용한다.
- 논리적 추적 키는 정상 알림 `telegram-weekly:{asOf}`, 품질 실패 알림 `telegram-quality:{asOf}`로 정의하지만 MVP에서는 영속 저장하거나 중복 차단에 사용하지 않는다.
- Notion의 `weekly-report:{asOf}` Report Key는 저장 upsert에만 사용하며 Telegram exactly-once 보장으로 재사용하지 않는다.

오류·재시도와 안전한 로그:

- 429 응답은 `parameters.retry_after`를 존중하되 대기 시간을 30초로 제한하고 최대 2회 재시도한다.
- 일시적 네트워크 오류와 5xx는 0.5초, 1초 간격으로 최대 2회 재시도한다.
- 잘못된 token은 `TELEGRAM_UNAUTHORIZED`, 찾을 수 없는 chat은 `TELEGRAM_CHAT_NOT_FOUND`, bot 차단은 `TELEGRAM_BOT_BLOCKED`, 기타 권한 실패는 `TELEGRAM_FORBIDDEN`, 429는 `TELEGRAM_RATE_LIMITED`, 네트워크 실패는 `TELEGRAM_NETWORK_ERROR`처럼 안전한 코드로 구분한다.
- Telegram API의 원문 `description`, 원문 응답 전체, token, chat ID, 메시지 본문은 로그에 남기지 않는다.
- 성공 로그에는 알림 종류, 기준일, `delivered: true`만 남기고 실패 로그에는 안전한 code, HTTP status, 기준일만 남긴다.

공식 API 참고:

- https://core.telegram.org/bots/api#sendmessage
- https://core.telegram.org/bots/api#formatting-options
- https://core.telegram.org/bots/api#responseparameters

## 로그 정책

- GitHub Actions 로그에 원시 시계열 전체를 출력하지 않는다.
- 오류 로그에도 API 응답 본문 전체를 기록하지 않는다.
- 오류 로그에는 지표 식별자, 요청 시각, HTTP 상태, 요약 오류 메시지만 남긴다.

## 저장소 구조

```text
macro-monitor/
├─ AGENTS.md
├─ README.md
├─ package.json
├─ docs/
├─ config/
├─ src/
├─ scripts/
├─ test/
├─ data/
│  ├─ schema/
│  └─ examples/
├─ reports/
├─ evals/
└─ .github/workflows/
```

`data/`와 `reports/`는 스키마, 합성 테스트 데이터, 비민감 예시 파일에만 사용한다. 실제 원시 시계열과 개인 보고서는 커밋하지 않는다.

## 초기 기술

- GitHub
- GitHub Actions
- Node.js 22
- JavaScript ES Modules
- FRED API
- Ajv
- 초기 AI 분석은 ChatGPT 수동
- 이후 OpenAI API
- Notion API
- 추후 Telegram Bot API

## MVP 제외

- 대시보드
- 자동매매
- 실시간 스트리밍
- 다중 에이전트
- Docker
- 상시 로컬 서버

## 보안

GitHub Secrets:
- FRED API 키
- OpenAI API 키
- Notion API 키
- Notion data source ID
- Telegram Bot Token
- Telegram Chat ID
