# Handoff

## 현재 단계

- Phase 1 완료
- Phase 2 완료
- Phase 3 데이터 자동 수집 MVP 완료
- Phase 4 위험 모델 핵심 구현 및 검증 완료
- Phase 4 마무리 및 Phase 5 준비 검증 완료
- Phase 5 포트폴리오 취약도 모델 첫 구현 완료
- 다음 검증: `Manual Portfolio Vulnerability Evaluation` 실행

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

### Phase 4 위험 모델

- 품질 게이트 구현 및 검증 완료
- 지표별 상태 판정 구현 및 검증 완료
- 영역별 위험 점수 계산 구현 및 검증 완료
- 전체 위험 단계 판정 구현 및 검증 완료
- `risk-output` schema 검증 완료
- `Manual Risk Model Evaluation` 실제 GitHub Actions 성공 확인
  - 첫 수직 슬라이스 run: `28736780393`
  - area aggregation run: `28736992100`
  - overallRisk run: `28737269543`
  - risk-output example 검증 run: `29086600175`
- 최종 확인된 Phase 4 출력:
  - `indicatorStatuses` populated
  - `areaRisks` populated
  - `overallRisk` populated
  - `risk-output` schema 통과

### Phase 4 마무리 및 Phase 5 준비

- `data/examples/risk-output.example.json` 추가
  - 실제 운영 데이터가 아닌 합성 예시
  - `indicatorStatuses`, `areaRisks`, `overallRisk`가 모두 채워진 risk-output 예시
- `scripts/validate-examples.js` 확장
  - 기존 indicator examples 검증 유지
  - `risk-output.example.json`을 `data/schema/risk-output.schema.json`으로 검증하도록 추가
- `docs/RISK_MODEL.md` 보강
  - 전체 위험 단계의 `overallRisk.level`은 discrete rule 우선
  - weighted score는 보조 지표
  - 충돌 시 discrete rule 우선
  - 현재 MVP에서 지속성·이례성 기반 high-risk 후보는 future rule로 명시
- `docs/PORTFOLIO.md` 추가 및 갱신
  - Phase 5 포트폴리오 취약도 모델 목적
  - `risk-output` 입력 계약
  - 포트폴리오 테마 설정 계약
  - 헷지 후보 설정 계약
  - Phase 5 출력 구조와 취약도 단계
  - 공개 저장소에 실제 개인 보유 수량·평가금액을 저장하지 않는 원칙
- `config/portfolio-themes.json` 추가
  - 테마별 일반적 매크로 민감도 초안
  - 실제 개인 보유 종목·수량·평가금액 없음
- `config/hedge-candidates.json` 추가
  - 테마 단위 헷지 후보 초안
  - 자동매매나 구체적 매수·매도 지시 아님
- `AGENTS.md` 갱신
  - Phase 5 라우팅을 `docs/PORTFOLIO.md`, `config/portfolio-themes.json`, `config/hedge-candidates.json` 기준으로 정리
- `docs/DECISIONS.md` 갱신
  - D-019: 전체 위험 단계 판정은 discrete rule 우선, weighted score 보조
  - D-020: Phase 5 포트폴리오 계약 파일명 확정
  - D-021: 공개 저장소의 포트폴리오 데이터 범위 확정
  - D-022: Phase 5 취약도 점수와 출력 범위 확정

### Phase 5 포트폴리오 취약도 첫 구현

- `data/schema/portfolio-vulnerability-output.schema.json` 추가
  - `sourceRisk`, `selection`, `themeVulnerabilities`, `warnings` 구조 정의
- `src/portfolio/evaluate-portfolio-vulnerability.js` 구현
  - `areaRisk.score × theme.macroExposures[areaId]`로 영역별 기여도 계산
  - 테마 취약도 점수는 기여도 합산
  - 음수 점수는 `easing`으로 보존
  - 상위 3개 enabled 테마만 출력
  - `watch` 이상 테마에만 헷지 후보 ID 연결
  - `quality.shouldAbort === true`이면 계산 중단 및 warning 생성
- `src/validation/validate-portfolio-vulnerability-output.js` 추가
- `scripts/run-portfolio-vulnerability.js` 추가
  - 입력 risk-output 경로를 받아 포트폴리오 취약도 출력 생성
  - 기본 입력은 `data/examples/risk-output.example.json`
- `package.json`에 `evaluate:portfolio` 명령 추가
- `data/examples/portfolio-vulnerability.example.json` 추가
- `scripts/validate-examples.js` 확장
  - portfolio vulnerability example을 schema로 검증
- `test/portfolio-vulnerability.test.js` 추가
  - 상위 3개 테마 정렬
  - 매크로 노출 기여도 계산
  - 음수 노출/easing 보존
  - reduced confidence 전달
  - abort 시 계산 생략
  - level band
  - output schema 검증
- `.github/workflows/manual-portfolio-vulnerability.yml` 추가

## 현재 실행 방법

GitHub Actions:
- 포트폴리오 취약도 검증: Actions → `Manual Portfolio Vulnerability Evaluation`
- 위험 모델 검증: Actions → `Manual Risk Model Evaluation`
- MVP 6개 통합 검증: Actions → `Manual All Indicator Collection`
- Lockfile 생성: Actions → `Generate Package Lock`
- 선택적으로 risk output path 또는 `as_of`를 입력
- 저장소 Secret `FRED_API_KEY` 필요

Node.js 환경:
- `npm ci --no-audit --no-fund`
- `npm test`
- `npm run validate:examples`
- `npm run evaluate:risk -- YYYY-MM-DD`
- `npm run evaluate:portfolio -- data/examples/risk-output.example.json`
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
- lockfile artifact workflow 성공 확인
- artifact 기반 `package-lock.json` 커밋 완료
- `Manual Risk Model Evaluation` 첫 수직 슬라이스 실제 GitHub Actions 성공
- area risk aggregation 추가 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- overallRisk 추가 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- risk-output example과 validate-examples 확장 후 `Manual Risk Model Evaluation` 실제 GitHub Actions 성공
- `test/risk-model.test.js`, `test/area-aggregation.test.js`, `test/overall-risk.test.js` 통과
- 실제 FRED 수집 결과 기반 populated `overallRisk` 포함 risk-output schema 통과

검증 대기:
- Phase 5 포트폴리오 취약도 첫 구현 후 `Manual Portfolio Vulnerability Evaluation` 실행
- `test/portfolio-vulnerability.test.js` 통과 확인
- `portfolio-vulnerability.example.json` schema 검증 확인
- `npm run evaluate:portfolio` 출력 schema 통과 확인

## 다음 세션이 읽을 문서

Phase 5 포트폴리오 취약도 검증 및 후속 구현 시 필수:
- `AGENTS.md`
- `docs/PORTFOLIO.md`
- `config/portfolio-themes.json`
- `config/hedge-candidates.json`
- `docs/HANDOFF.md`

선택:
- 영역 점수 형식 확인 시 `docs/RISK_MODEL.md`
- risk-output 입력 계약 확인 시 `data/schema/risk-output.schema.json`
- 포트폴리오 취약도 출력 계약 확인 시 `data/schema/portfolio-vulnerability-output.schema.json`
- 구조적 결정 확인 시 `docs/DECISIONS.md`
- 아키텍처 원칙 확인 시 `docs/ARCHITECTURE.md`

## 미해결

- `Manual Portfolio Vulnerability Evaluation` 실제 GitHub Actions 검증
- Phase 5를 실제 live risk-output과 연결하는 통합 실행 경로 설계
- 이후 AI 보고서 생성 단계 설계
