# Weekly Report Specification

## 0. AI 보고서 생성 계약

AI 보고서 생성 단계의 입력은 `macro-review` JSON이다.

단일 입력 계약:

- `data/schema/macro-review-output.schema.json`

AI의 출력은 자유 형식 Markdown이 아니라 구조화된 JSON이다.

단일 출력 계약:

- `data/schema/weekly-report-output.schema.json`

이후 Markdown, Notion, Telegram용 문장은 이 구조화된 JSON을 렌더링해서 만든다.

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
→ macro-review output validation
→ OpenAI Responses API 호출
→ weekly-report-output JSON 파싱
→ weekly-report-output schema 검증
→ macro-review 원본과 consistency 검증
→ JSON 출력
```

OpenAI API 키는 `OPENAI_API_KEY` 환경변수 또는 GitHub Secret으로만 전달한다. API 키와 OpenAI 원문 응답 전체는 로그에 남기지 않는다.

OpenAI 호출은 Structured Outputs(`text.format.type = "json_schema"`, `strict: true`)로 요청하고 `data/schema/weekly-report-output.schema.json`을 출력 계약으로 전달한다. API 단계에서 schema 준수를 강제하며, 최종 안전장치로 로컬 `weekly-report-output` schema 검증과 macro-review consistency 검증을 모두 유지한다.

### AI 역할

AI는 다음만 수행한다.

- 핵심 변화 요약
- 위험 성격 설명
- 상충 신호 정리
- 취약 테마의 핵심 이유 정리
- 헷지 필요성 문장화
- 다음 주 체크리스트 문장화

AI는 다음을 수행하지 않는다.

- 지표 수치 재계산
- 위험 등급 재판정
- 포트폴리오 취약도 점수 재계산
- 입력에 없는 최신 뉴스, 일정, 가격 생성
- 특정 종목 매수·매도 추천
- 실제 개인 보유 수량·평가금액 추정

### 입력 우선순위

- 전체 위험 단계는 `macroReviewOutput.riskOutput.overallRisk.level`을 따른다.
- 영역별 위험도는 `macroReviewOutput.riskOutput.areaRisks[]`를 따른다.
- 테마별 취약도는 `macroReviewOutput.portfolioVulnerability.themeVulnerabilities[]`를 따른다.
- 신뢰도는 `macroReviewOutput.riskOutput.quality.confidence`를 따른다.
- warnings는 삭제하지 않고 보고서 warnings로 전달한다.

### 출력 검증

AI 응답은 다음 검증을 모두 통과해야 한다.

1. JSON 파싱 가능
2. `data/schema/weekly-report-output.schema.json` 통과
3. `sourceMacroReview.asOf`, `overallLevel`, `overallScore`, `confidence`, `topThemeIds`가 입력 `macroReviewOutput`과 일치
4. 보고서 내 영역별 `score`, `status`가 입력 `riskOutput.areaRisks[]`와 일치
5. 보고서 내 테마별 `score`, `level`이 입력 `portfolioVulnerability.themeVulnerabilities[]`와 일치

검증 실패 시 임의로 보정하지 않고 명확한 error code와 요약 메시지만 출력한다.

## 1. 한눈에 보는 결론

- 기준일
- 전체 위험 단계
- 지난주 대비
- 핵심 변화 최대 3개
- 우선 점검할 테마 최대 3개
- 권장 행동

## 2. 주요 지표 현황

| 지표 | 현재값 | 주간 변화 | 4주 변화/보조지표 | 상태 | 특이사항 |
|---|---:|---:|---:|---|---|

특이사항이 없으면 `—`.
지표별 장문 해설은 작성하지 않는다.

보고서 표의 `현재값`, `주간 변화`, `4주 변화/보조지표`는 계산용 숫자가 아니라 사람이 읽는 표시 문자열 또는 `null`이다.

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