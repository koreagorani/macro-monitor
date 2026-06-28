# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 설계 및 준비 중

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
- 시장가격형은 휴일·결측일에 목표일 이하의 최근 유효 관측값을 사용하도록 확정
- 미국 2년물 변화는 bp, 나머지 시장가격형 변화는 백분율로 계산하도록 확정
- 근원 PCE는 지수 수준에서 전월비와 최근 3개월 평균을 계산하도록 확정
- 계산값은 원래 정밀도를 유지하고 보고서 표시 단계에서만 반올림하도록 확정
- 지표별 실패 처리와 스키마 계약을 `docs/REQUIREMENTS.md`에 반영
- 스키마 위치와 데이터 처리 구조를 `docs/ARCHITECTURE.md`에 반영
- 관련 구조적 결정을 D-014로 기록

## 현재 작업

Phase 3 데이터 자동 수집 구현 준비:

- JavaScript와 TypeScript 중 구현 언어 결정
- FRED API 호출 모듈 설계
- 유효 관측값 선택 함수 구현
- 시장가격형 변화 계산 함수 구현
- 근원 PCE 전월비 계산 함수 구현
- 스키마 검증과 수동 실행 화면 출력 구현

## Phase 3 완료 조건

- 시장가격형 지표의 기준일 현재값, 전주 대비 변화율, 4주 누적 변화율 계산
- 근원 PCE의 현재 전월비, 이전 전월비, 3개월 평균 계산
- 정규화된 데이터 구조 생성 및 JSON Schema 검증
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
- 구조적 결정 확인 시 `docs/DECISIONS.md`

## 검증 결과

- `config/indicators.json`: JSON 문법 정상, MVP 지표 ID 6개 확인
- `data/schema/indicator-output.schema.json`: JSON 문법 정상, 공통 필드와 유형별 `metrics` 분기 확인
- `data/examples/market-price.example.json`: JSON 문법 정상, 시장가격형 계약과 일치
- `data/examples/scheduled-release.example.json`: JSON 문법 정상, 정기발표형 계약과 일치
- 예시 값은 실제 시장 데이터가 아닌 합성 값이며 계산 정밀도 보존 확인
- `RISK_MODEL.md`의 미국 2년물 bp, 근원 PCE 전월비·3개월 평균, 시장가격형 변화율 입력 요구와 충돌 없음

## 미해결

- JavaScript와 TypeScript 중 선택
- FRED API 키 발급 및 GitHub Secrets 등록
- 핵심 지표의 범위
- 핵심 지표 2개 이상 실패 시 중단 로직의 구체적 적용 위치
- 스키마 검증 라이브러리 선택
