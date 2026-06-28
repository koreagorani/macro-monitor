# Macro Monitor

주간 매크로 환경을 점검하고 포트폴리오의 테마별 취약도를 분석하는 프로젝트다.

## 목적

- 핵심 매크로 지표 수집
- 규칙 기반 위험 점수 계산
- 포트폴리오 테마별 취약도 평가
- AI 기반 주간 보고서 생성
- 개인 Notion 저장 및 추후 Telegram 경고

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

- `AGENTS.md`: 작업별 문서 라우팅과 문서 역할
- `docs/PROJECT_CONTEXT.md`: 프로젝트 목적과 사용자 환경
- `docs/ARCHITECTURE.md`: 시스템 구조와 데이터 처리 방식
- `docs/ROADMAP.md`: 단계별 범위와 완료 조건
- `docs/DECISIONS.md`: 구조적 결정과 이유
- `docs/HANDOFF.md`: 현재 진행 상태와 다음 작업

현재 단계와 최근 변경 사항은 `docs/HANDOFF.md`를 기준으로 확인한다.
