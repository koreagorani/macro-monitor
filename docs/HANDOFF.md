# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 MVP 완료
- Phase 4 위험 모델 구현 준비 진행 중

## 완료된 내용

### Phase 1 수동 보고서 검증

- 실제 데이터로 수동 보고서 3회 작성
- 5분 이내 핵심 판단 가능 여부 확인
- 취약 테마 출력 수와 헷지 제안 규칙 정리

### Phase 2 GitHub 하네스 구성

- 문서 구조와 `AGENTS.md` 라우팅 구성
- README와 config 설정 파일 초안 생성
- 새 세션이 작업 유형에 필요한 문서만 읽고 시작할 수 있는 구조 확보

### Phase 3 데이터 수집 MVP

- MVP 지표 6개를 FRED API 기반으로 설정
- 정규화 출력 계약과 JSON Schema 작성
- 시장가격형 5개 수집·계산·검증 완료
- 근원 PCE 수집·전월비 계산·검증 완료
- MVP 6개 통합 수집 워크플로 실제 성공 확인
  - run: `28704090587`
  - job: `collect-all-indicators`
  - strict 모드 통과

### Phase 4 준비 결정

- 핵심 지표 범위 결정 완료
  - 핵심: `us2y`, `core_pce`, `wti`, `usdkrw`, `sp500`
  - 비핵심: `btc`
- 핵심 지표 2개 이상 실패 시 중단 판단은 데이터 수집기 내부가 아니라 수집 완료 후 위험점수 계산 전 품질 게이트에서 수행하기로 결정
- `package-lock.json`은 Phase 4 코드 구현 전에 `npm install` 결과로 생성해 커밋하기로 결정
- 관련 구조적 결정은 `docs/DECISIONS.md`의 D-016, D-017, D-018에 기록

### Phase 4 설정 기반

- `config/thresholds.json` 작성
  - `RISK_MODEL.md`의 MVP 임계값을 코드가 읽을 수 있는 지표별 상태 판정 규칙으로 구조화
  - 상태 코드는 `easing`, `normal`, `watch`, `alert`, `strong_alert` 사용
  - 점수는 `-1`, `0`, `1`, `2`, `3` 사용
  - 현재 수집 가능한 `weeklyChange`, `fourWeekChange`, `currentMoM`, `threeMonthAverageMoM` 중심으로 활성 규칙 작성
  - consensus, 24시간 변화, 3년 백분위 등 미수집 항목은 disabled 또는 future로 표시
- `config/risk-areas.json` 작성
  - 영역 정의와 가중치 작성
  - 지표-영역 연결 작성
  - `core_pce`의 60/40 배분 반영
  - `sp500`과 `btc`가 함께 `risk_appetite`에 연결될 때 MVP에서는 영역 내 단순 평균 방침 명시
  - 핵심/비핵심 지표와 품질 게이트 기준 반영

### Lockfile 생성 및 커밋

- `Generate Package Lock` GitHub Actions workflow 추가
- 자동 커밋 없이 `package-lock.json`을 artifact로 업로드하도록 구성
- 첫 실행 실패 확인
  - run: `28734643805`
  - lockfile 생성, registry URL 검증, `npm test` 성공
  - `npm run validate:examples` 실패
  - 원인: `npm install --package-lock-only`는 `node_modules`를 설치하지 않음
- workflow 수정 완료
  - lockfile 생성 및 URL 검증 후 `npm ci --no-audit --no-fund` 추가
- 수정 후 재실행 성공 확인
  - run: `28736466987`
  - job: `generate-package-lock`
  - lockfile 생성 성공
  - `registry.npmjs.org` resolved URL 검증 성공
  - `npm ci`, `npm test`, `npm run validate:examples` 성공
  - artifact `package-lock-json` 업로드 성공
- artifact를 다운로드해 확인 후 `package-lock.json` 커밋 완료
  - 모든 `resolved` URL hostname은 `registry.npmjs.org`
  - 커밋: `eea983b542c753dc6d7685ec6ae337cd2c0a2beb`

## package-lock 상태

- `package-lock.json` 생성 및 커밋 완료
- 현재 의존성 고정 버전:
  - `ajv`: `8.20.0`
  - `ajv-formats`: `3.0.1`
- Phase 4 구현부터는 `npm ci --no-audit --no-fund` 사용 가능

## 현재 실행 방법

GitHub Actions:
- Lockfile 생성: Actions → `Generate Package Lock`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- 선택적으로 `as_of`를 `YYYY-MM-DD`로 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run collect:all -- YYYY-MM-DD`
- `npm run collect:market-prices -- YYYY-MM-DD`
- `npm run collect:core-pce -- YYYY-MM-DD`
- `npm run collect:us2y -- YYYY-MM-DD`

## 검증 결과

확인 완료:
- 미국 2년물 실제 GitHub Actions 성공
- 시장가격형 5개 실제 GitHub Actions 성공
- 근원 PCE 실제 GitHub Actions 성공
- MVP 6개 통합 실제 GitHub Actions 성공
- strict 모드 통과로 6개 지표 모두 `available: true`로 간주
- 모든 결과가 JSON Schema 검증을 통과한 것으로 간주
- 원시 API 응답 전체와 전체 시계열은 저장소에 커밋하지 않음
- `thresholds.json`과 `risk-areas.json` JSON 구조 작성 및 재조회 확인
- lockfile artifact workflow 성공 확인
- artifact 기반 `package-lock.json` 커밋 완료

검증 대기:
- Phase 4 설정 파일을 사용하는 위험점수 코드 구현 전 테스트 추가

## Phase 4 설계 방향

- `docs/RISK_MODEL.md`는 위험모델의 설명 기준과 초기 휴리스틱의 단일 출처로 둔다.
- `config/thresholds.json`에는 코드가 읽을 지표별 임계값과 상태 점수 규칙을 둔다.
- `config/risk-areas.json`에는 영역 정의, 영역 가중치, 지표와 영역의 연결 관계를 둔다.
- 위험점수 코드는 수집 결과를 직접 재계산하지 않고 정규화 출력의 `metrics`만 사용한다.
- 데이터 품질 게이트는 위험점수 계산 전 단계에 둔다.

## 다음 작업 후보

1. 위험점수 출력 스키마 설계
2. 지표별 상태 판정 함수 구현
3. 영역별 위험 점수 계산 구현
4. 전체 위험 단계 판정 구현
5. 위험 모델 수동 실행 명령 및 GitHub Actions 검증 경로 추가

## 다음 세션이 읽을 문서

Phase 4 위험 모델 구현 시 필수:
- `AGENTS.md`
- `docs/RISK_MODEL.md`
- `docs/ARCHITECTURE.md`
- `config/thresholds.json`
- `config/risk-areas.json`
- `docs/HANDOFF.md`

선택:
- 입력 데이터 형식 확인 시 `docs/REQUIREMENTS.md`
- 구조적 결정 확인 시 `docs/DECISIONS.md`

## 미해결

- 위험점수 출력 스키마 확정
- Phase 4 위험점수 코드 구현
