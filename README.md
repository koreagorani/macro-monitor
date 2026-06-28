# Macro Monitor

주간 매크로 환경 모니터링 및 포트폴리오 취약도 분석 프로젝트.

## 목적

- 핵심 매크로 지표 수집
- 위험 점수 계산
- 포트폴리오 취약도 평가
- AI 기반 주간 보고서 생성

## 현재 단계

Phase 3: 데이터 자동 수집 준비 및 구현

완료:
- Phase 1 수동 보고서 검증
- Phase 2 GitHub 하네스 구성

## 저장소 구조

```text
macro-monitor/
├─ AGENTS.md
├─ README.md
├─ docs/
├─ config/
├─ prompts/
├─ scripts/
├─ data/
├─ reports/
├─ evals/
└─ .github/workflows/
```

## 주요 문서

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/HANDOFF.md`

## 현재 작업 범위

- MVP 지표 6개 데이터 소스 확정
- `config/indicators.json` 작성
- 데이터 출력 스키마 정의
- 수동 실행 가능한 데이터 수집 구현

## 현재 제외

- 위험 모델 구현
- 포트폴리오 모델 구현
- AI 보고서 자동 생성
- Notion 연동
- Telegram 연동
