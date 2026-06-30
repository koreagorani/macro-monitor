# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 구현 진행 중

## 완료된 내용

### Phase 1 수동 보고서 검증

- 실제 데이터로 수동 보고서 3회 작성
- 5분 이내 핵심 판단 가능 여부 확인
- 취약 테마 출력 수와 헷지 제안 규칙 정리

### Phase 2 GitHub 하네스 구성

- 문서 구조와 `AGENTS.md` 라우팅 구성
- README와 config 설정 파일 초안 생성
- 새 세션이 작업 유형에 필요한 문서만 읽고 시작할 수 있는 구조 확보

### Phase 3 데이터 수집 설계

- MVP 지표 6개를 FRED API 기반으로 설정
- `config/indicators.json`에 지표 ID, 유형, 출처, 단위, 계산 방식, 표시 자릿수 작성
- 시장가격형과 정기발표형의 공통 출력 계약 작성
- JSON Schema를 `data/schema/indicator-output.schema.json`에 생성
- 시장가격형과 근원 PCE의 합성 예시를 `data/examples/`에 생성

### Phase 3 시장가격형 구현

- 구현 언어를 Node.js 22 JavaScript ES Modules로 확정
- Ajv 기반 JSON Schema 검증 구조 추가
- FRED API 공통 호출 모듈 구현
- FRED 결측값 제거와 최근 유효 관측값 선택 함수 구현
- UTC 기준 날짜 차감 함수 구현
- 공통 시장가격형 계산 함수 구현
  - `us2y`: 주간·4주 변화 bp
  - `wti`, `usdkrw`, `btc`, `sp500`: 주간·4주 변화율 `%`
- 시장가격형 5개를 공통 collector로 순회하는 오케스트레이터 구현
- 지표별 실패를 `available: false`, `metrics: null`, 안전한 `error` 객체로 격리
- 각 결과를 공통 JSON Schema로 개별 검증
- 계산값은 원래 정밀도를 유지하고 표시 자릿수는 `config/indicators.json`에 보존
- 실제 원시 시계열과 개인 보고서를 저장소에 기록하지 않음
- 미국 2년물 단일 워크플로 실제 성공 확인
  - 의존성 설치 성공
  - 단위 테스트 성공
  - 합성 예시 검증 성공
  - FRED API 호출 성공
  - `available: true` 성공 객체 생성
- GitHub 공식 Action 내부 런타임 warning은 비차단 경고로 확인
- 전체 시장가격형 검증용 `Manual Market Price Collection` 워크플로 추가

## 현재 실행 방법

GitHub Actions:
- 미국 2년물 단일 검증: Actions → `Manual US2Y Collection`
- 시장가격형 5개 검증: Actions → `Manual Market Price Collection`
- 선택적으로 `as_of`를 `YYYY-MM-DD`로 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm install --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run collect:us2y -- YYYY-MM-DD`
- `npm run collect:market-prices -- YYYY-MM-DD`

## 검증 정책

일반 실행:
- 지표 하나가 실패해도 다른 지표 수집은 계속한다.
- 실패 결과도 스키마에 맞는 정규화 객체로 출력한다.

GitHub Actions 실제 검증:
- `STRICT_MARKET_COLLECTION=true`를 사용한다.
- 스키마 오류 또는 시장가격형 지표 하나라도 `available: false`이면 검증 job을 실패시킨다.
- 원시 API 응답 전체와 전체 시계열은 로그에 출력하지 않는다.

## 검증 결과

확인 완료:
- 미국 2년물 실제 GitHub Actions 성공
- 공통 collector가 `market_price` 유형만 선택하도록 구현
- 다섯 지표 모두 기존 설정의 단위·계산 방식·표시 자릿수를 재사용
- 백분율 변화 계산 단위 테스트 추가
- 두 지표 중 하나의 FRED 호출이 실패해도 다른 지표가 성공하는 실패 격리 테스트 추가
- 통합 실행 결과를 지표별 JSON Schema로 검증하도록 연결
- 전체 시장가격형 검증 워크플로 구조 정적 확인

실행 검증 대기:
- `Manual Market Price Collection` 실제 실행
- `wti`, `usdkrw`, `btc`, `sp500` 실제 FRED 응답과 스키마 검증

## Phase 3 완료 조건

- 시장가격형 지표 5개의 기준일 현재값, 전주 대비 변화율 또는 bp, 4주 누적 변화율 또는 bp 계산
- 근원 PCE의 현재 전월비, 이전 전월비, 3개월 평균 계산
- 모든 지표의 정규화된 데이터 구조 생성 및 JSON Schema 검증
- 지표별 실패 격리와 보고서 신뢰도 처리
- 원시 시계열은 계산 후 폐기하고 저장소에 커밋하지 않음
- 수동 실행 화면에서 결과 확인 가능

## 다음 세션이 읽을 문서

필수:
- `AGENTS.md`
- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `config/indicators.json`
- `data/schema/indicator-output.schema.json`
- `docs/HANDOFF.md`

선택:
- 지표 판정 필드 확인 시 `docs/RISK_MODEL.md`
- 구현 언어와 구조적 결정 확인 시 `docs/DECISIONS.md`

## 미해결

- `Manual Market Price Collection` 실제 GitHub Actions 실행 검증
- `package-lock.json` 생성 및 의존성 버전 고정
- 근원 PCE 수집과 전월비 계산 구현
- 핵심 지표의 범위
- 핵심 지표 2개 이상 실패 시 중단 로직의 구체적 적용 위치
