# Macro Monitor

주간 매크로 환경을 점검하고 포트폴리오의 테마별 취약도를 분석하는 프로젝트다.

## 목적

- 핵심 매크로 지표 수집
- 규칙 기반 위험 점수 계산
- 포트폴리오 테마별 취약도 평가
- AI 기반 주간 보고서 생성
- 개인 Notion 저장 및 Telegram 요약·경고

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


## 운영

매주 월요일 09:17 KST 전후(00:17 UTC, `17 0 * * 1`) 자동 실행한다. GitHub 실행은 지연될 수 있다. 장애 복구는 Actions의 **Manual Weekly Report Telegram Notification**에서 **Run workflow**, main을 선택한다. as_of 공란은 UTC 실행일이며 특정 날짜도 지정할 수 있다.

Notion은 idempotent upsert이고 Telegram 재실행은 중복 전송될 수 있다. portfolio held-theme Secret은 수동 동기화하며 Google Drive 자동 동기화는 아직 없다. 자세한 운영 정책은 [ARCHITECTURE](docs/ARCHITECTURE.md)의 주간 production schedule, 검증 상태는 [HANDOFF](docs/HANDOFF.md)를 확인한다.
