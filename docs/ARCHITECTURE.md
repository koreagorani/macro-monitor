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
