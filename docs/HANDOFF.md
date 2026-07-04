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

### Phase 3 시장가격형 구현 및 검증

- FRED API 공통 호출 모듈 구현
- 결측값 제거와 최근 유효 관측값 선택 함수 구현
- 시장가격형 공통 계산 함수 구현
- 시장가격형 5개 병렬 수집 오케스트레이터 구현
- 지표별 실패 격리 구현
- 각 결과를 공통 JSON Schema로 개별 검증
- 미국 2년물 단일 워크플로 실제 성공 확인
- `Manual Market Price Collection` 첫 실행의 테스트 실패 수정
- `Manual Market Price Collection` 재실행 성공 확인
  - run: `28703080661`
  - job: `collect-market-prices`
  - 의존성 설치, 단위 테스트, 합성 예시 검증, 시장가격형 5개 실제 수집 모두 성공
  - strict 모드 통과

### Phase 3 근원 PCE 구현 및 검증

- FRED `PCEPILFE` 수집용 scheduled release collector 구현
- FRED 지수 수준에서 전월비 계산 구현
- 최신 전월비, 이전 전월비, 최근 3개월 전월비 평균 계산 구현
- 시장 예상치는 `null` 유지
- 정기발표형 정규화 객체 생성 및 JSON Schema 검증 연결
- `npm run collect:core-pce -- YYYY-MM-DD` 수동 명령 추가
- `Manual Core PCE Collection` GitHub Actions 워크플로 추가
- 합성 월간 지수 데이터 기반 단위 테스트 추가
- `Manual Core PCE Collection` 실제 실행 성공 확인
  - run: `28703880180`
  - job: `collect-core-pce`
  - 의존성 설치, 단위 테스트, 합성 예시 검증, 실제 `PCEPILFE` 수집 모두 성공

### Phase 3 MVP 통합 수집 준비

- 시장가격형 5개와 근원 PCE를 한 번에 수집하는 통합 collector 추가
- 공통 JSON Schema 검증 결과 배열 유틸리티 추가
- `npm run collect:all -- YYYY-MM-DD` 수동 명령 추가
- `Manual All Indicator Collection` GitHub Actions 워크플로 추가
- 합성 데이터 기반 통합 collector 단위 테스트 추가

## 현재 실행 방법

GitHub Actions:
- 미국 2년물 단일 검증: Actions → `Manual US2Y Collection`
- 시장가격형 5개 검증: Actions → `Manual Market Price Collection`
- 근원 PCE 검증: Actions → `Manual Core PCE Collection`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- 선택적으로 `as_of`를 `YYYY-MM-DD`로 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm install --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run collect:us2y -- YYYY-MM-DD`
- `npm run collect:market-prices -- YYYY-MM-DD`
- `npm run collect:core-pce -- YYYY-MM-DD`
- `npm run collect:all -- YYYY-MM-DD`

## 검증 결과

확인 완료:
- 미국 2년물 실제 GitHub Actions 성공
- 시장가격형 5개 실제 GitHub Actions 성공
- 시장가격형 결과가 strict 모드를 통과했으므로 다섯 지표 모두 `available: true`로 간주
- 근원 PCE 실제 GitHub Actions 성공
- 근원 PCE 결과가 성공했으므로 `core_pce.available: true`와 JSON Schema 통과로 간주
- MVP 6개 통합 collector와 워크플로 정적 구현 완료

실행 검증 대기:
- `Manual All Indicator Collection` 실제 GitHub Actions 실행
- MVP 6개 전체 결과의 strict 모드 통과 확인

## Phase 3 완료 조건

- 시장가격형 지표 5개의 기준일 현재값, 전주 대비 변화율 또는 bp, 4주 누적 변화율 또는 bp 계산 완료
- 근원 PCE의 현재 전월비, 이전 전월비, 3개월 평균 계산 완료
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

- `Manual All Indicator Collection` 실제 GitHub Actions 실행 검증
- `package-lock.json` 생성 및 의존성 버전 고정
- 핵심 지표의 범위
- 핵심 지표 2개 이상 실패 시 중단 로직의 구체적 적용 위치
