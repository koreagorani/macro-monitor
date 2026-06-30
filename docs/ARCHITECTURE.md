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
└─ validation/    # JSON Schema 검증

scripts/          # 수동 실행 진입점
test/             # 합성 데이터 기반 단위 테스트
```

- 외부 API 응답 처리와 계산 로직을 분리한다.
- `domain/` 함수는 네트워크나 환경변수에 의존하지 않는다.
- 실행 스크립트는 설정 로딩, 수집, 검증, 화면 출력을 연결한다.

## 보고서 전달 경로

- Notion 연동 전에는 생성된 보고서를 수동 실행 화면에만 출력한다.
- 이 단계에서는 보고서 파일을 저장소에 커밋하거나 장기 보관하지 않는다.
- Notion 연동 후에는 최종 보고서를 개인 Notion 데이터베이스로 전송한다.
- Telegram 연동 후에는 핵심 요약과 경고만 전송한다.

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
- Telegram Bot Token
- Telegram Chat ID
