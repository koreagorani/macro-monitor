# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 구현 시작

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

### Phase 3 첫 최소 수직 슬라이스

- 구현 언어를 Node.js 22 JavaScript ES Modules로 확정
- Ajv 기반 JSON Schema 검증 구조 추가
- `src/clients/`, `src/collectors/`, `src/config/`, `src/domain/`, `src/validation/` 구조 생성
- FRED API 공통 호출 모듈 구현
- FRED 결측값 제거와 최근 유효 관측값 선택 함수 구현
- UTC 기준 날짜 차감 함수 구현
- 미국 2년물의 현재값, 주간 변화, 4주 변화 bp 계산 구현
- 정규화 출력 객체 생성 및 JSON Schema 검증 연결
- API 키 누락과 HTTP·네트워크·타임아웃 오류를 민감하지 않은 요약 오류로 변환
- Node 내장 테스트로 결측 제거, 날짜 선택, 날짜 계산, bp 계산 테스트 작성
- 합성 예시 스키마 검증 명령 추가
- GitHub Actions `workflow_dispatch` 수동 실행 화면 추가

## 현재 실행 방법

GitHub Actions:
- Actions → `Manual US2Y Collection` → Run workflow
- 선택적으로 `as_of`를 `YYYY-MM-DD`로 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm install --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run collect:us2y -- YYYY-MM-DD`

## 검증 결과

확인 완료:
- 구현 파일과 import 경로 정적 검토
- 원시 API 응답 전체를 출력하지 않는 오류 처리 확인
- 미국 2년물 계산이 `config/indicators.json`과 `RISK_MODEL.md`의 bp 요구에 맞는지 확인
- 실패 결과도 공통 스키마의 `available`, `metrics`, `error` 구조를 따르도록 확인
- GitHub Actions가 테스트 → 합성 예시 검증 → 실제 수집 순서로 실행되도록 확인

실행 검증 미완료:
- 현재 작업 컨테이너의 외부 DNS가 차단되어 GitHub 복제와 `npm install`을 실제 실행하지 못함
- GitHub Actions 수동 실행은 아직 수행하지 않음
- 실제 FRED API 성공 응답과 스키마 검증은 `FRED_API_KEY` 등록 후 확인 필요

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

- 저장소 Secret `FRED_API_KEY` 등록
- GitHub Actions 수동 실행으로 테스트와 실 API 호출 검증
- `package-lock.json` 생성 및 의존성 버전 고정
- 나머지 시장가격형 4개 지표 수집 연결
- 근원 PCE 수집과 전월비 계산 구현
- 핵심 지표의 범위
- 핵심 지표 2개 이상 실패 시 중단 로직의 구체적 적용 위치
