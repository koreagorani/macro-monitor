# Architecture

## 흐름

```text
데이터 API
→ 원시 데이터
→ 정규화
→ 변화 계산
→ 지표 상태
→ 이례성
→ 영역 위험
→ 테마 취약도
→ AI 해석
→ 보고서
→ Notion
→ 경고
→ Telegram
```

## 원칙

- 수집과 판단 분리
- 판단과 AI 해석 분리
- 포트폴리오와 민감도 분리
- 임계값은 설정 파일
- 수동 실행 가능
- 오류 시 보고서 생성 중단 또는 신뢰도 하향

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

## 초기 기술

- GitHub
- GitHub Actions
- JavaScript 또는 TypeScript
- 데이터 API
- 초기 AI 분석은 ChatGPT 수동
- 이후 OpenAI API
- Notion API
- 추후 Telegram Bot API

## MVP 제외

- 대시보드
- 자동매매
- 실시간 스트리밍
- 다중 에이전트
- Docker
- 상시 로컬 서버

## 보안

GitHub Secrets:
- 데이터 API 키
- OpenAI API 키
- Notion API 키
- Telegram Bot Token
- Telegram Chat ID
