# Portfolio Vulnerability Model

## 목적

Phase 5의 목적은 Phase 4에서 생성한 `risk-output`을 입력으로 받아 포트폴리오 테마별 매크로 취약도를 계산하는 것이다.

이 모델은 기대수익률, 매수·매도 신호, 자동매매 신호가 아니다. 현재 매크로 위험이 어떤 포트폴리오 테마에 더 크게 전달될 수 있는지를 구조화해 보여주는 노출도 모델이다.

## 입력

### 1. 위험 모델 출력

단일 출처:

- `data/schema/risk-output.schema.json`

Phase 5에서 우선 사용하는 필드:

```text
asOf
quality.confidence
overallRisk.level
overallRisk.score
overallRisk.triggeredRules
areaRisks[].areaId
areaRisks[].score
areaRisks[].status
areaRisks[].weight
areaRisks[].contributingIndicators
warnings
```

`quality.shouldAbort === true`인 경우 포트폴리오 취약도 계산은 수행하지 않는다.

### 2. 포트폴리오 테마 설정

단일 출처:

- `config/portfolio-themes.json`

각 테마는 다음 정보를 가진다.

```text
themeId
name
description
enabled
macroExposures
positionWeightPolicy
notes
```

`macroExposures`는 위험 영역별 민감도다. 값은 음수, 0, 양수를 허용한다.

- 양수: 해당 영역 위험이 높아질수록 취약도 증가
- 0: 직접 민감도 없음
- 음수: 해당 영역 위험이 높아질 때 상대적으로 방어 또는 완화 가능성

초기 MVP는 실제 보유 종목과 수량을 저장소에 커밋하지 않는다. 테마 정의와 일반적 민감도만 공개 저장소에 둔다.

### 3. 헷지 후보 설정

단일 출처:

- `config/hedge-candidates.json`

헷지 후보는 테마 단위로 정의한다. Phase 5의 첫 구현에서는 헷지 실행을 자동화하지 않고, 취약도 출력에 연결 가능한 후보 목록만 제공한다.

## 출력 초안

Phase 5 출력은 다음 형태를 목표로 한다.

```json
{
  "schemaVersion": "1.0.0",
  "asOf": "2026-07-05",
  "sourceRisk": {
    "overallLevel": "watch",
    "overallScore": 0.82,
    "confidence": "normal"
  },
  "themeVulnerabilities": [
    {
      "themeId": "crypto_altcoins",
      "name": "알트코인",
      "score": 2.1,
      "level": "alert",
      "macroContributions": [
        {
          "areaId": "risk_appetite",
          "areaScore": 2,
          "exposure": 1.5,
          "contribution": 3
        }
      ],
      "reasons": [
        "위험선호 영역 악화에 대한 민감도가 큽니다."
      ],
      "confidence": "normal",
      "hedgeCandidateIds": ["cash_krw", "short_duration_bonds"]
    }
  ],
  "warnings": []
}
```

## 취약도 계산 MVP 원칙

1. `areaRisks`의 영역 점수를 입력으로 사용한다.
2. 테마별 `macroExposures`와 영역 점수를 곱해 영역별 기여도를 계산한다.
3. 테마 취약도 점수는 영역별 기여도의 합으로 계산한다.
4. 음수 기여도는 완화 신호로 유지하되, 최종 취약도 하한은 구현 단계에서 별도 결정한다.
5. 보유 비중은 공개 저장소에 직접 저장하지 않는다. 필요 시 별도 비공개 입력으로 받고, 공개 모델에서는 `positionWeightPolicy`만 정의한다.
6. 출력 테마는 기본적으로 상위 3개로 제한한다. 4위는 3위와 점수가 유사하고 위험 성격이 다를 때만 보조 표시한다.
7. 헷지는 필요성 판단 이후 테마 단위 후보를 연결한다.

## 신뢰도 처리

- `quality.confidence === "normal"`: 정상 계산
- `quality.confidence === "reduced"`: 취약도 계산은 계속하되 출력 confidence를 `reduced`로 낮춘다.
- `quality.confidence === "aborted"` 또는 `quality.shouldAbort === true`: 취약도 계산을 중단한다.

## 공개 저장소 보관 정책

공개 저장소에 둘 수 있는 것:

- 테마 정의
- 일반적 매크로 민감도
- 헷지 후보 카테고리
- 합성 예시
- 스키마와 테스트 데이터

공개 저장소에 두지 않는 것:

- 실제 보유 종목별 수량
- 실제 평가금액
- 개인 최종 보고서
- 운영 원시 시계열
- 비밀키

## Phase 5 첫 구현 범위

구현할 것:

1. 포트폴리오 취약도 출력 스키마
2. 테마별 취약도 계산 함수
3. `risk-output`을 입력으로 받는 실행 스크립트 또는 내부 연결 함수
4. 합성 테스트
5. 필요 시 수동 검증 workflow

아직 구현하지 않을 것:

- AI 보고서 생성
- Notion 저장
- Telegram 알림
- 자동매매
- 실제 개인 보유 데이터 저장
