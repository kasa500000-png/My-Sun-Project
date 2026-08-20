# 마이썬 운동일지 UI·UX 프로젝트

## 핵심 문서

- [프로젝트 컨텍스트](00-project-context.md)
- [실행 환경과 기술 스택](01-runtime-and-stack.md)
- [화면 인벤토리](02-screen-inventory.md)
- [핵심 사용자 여정](03-user-journeys.md)
- [기준 감사](04-baseline-audit.md)
- [문제 백로그](05-issue-backlog.md)
- [디자인 원칙](06-design-principles.md)
- [디자인 시스템](07-design-system.md)
- [접근성 감사](08-accessibility-audit.md)
- [성능 감사](09-performance-audit.md)
- [웹·PWA·네이티브 범위](10-native-parity.md)
- [30단계 진행 현황](30-stage-progress.md)
- [최종 보고서](final-report.md)
- [배포 체크리스트](release-checklist.md)

## 증거와 테스트

- 단계별 로그: `.logs/uiux/stage-01.md` ~ `stage-30.md`
- 화면 증거 정책: `artifacts/uiux/README.md`
- 접근성 계약: `tests/uiux-accessibility.test.mjs`
- 성능 계약: `tests/uiux-performance.test.mjs`
- 전체 회귀 계약: `tests/uiux-regression.test.mjs`
- E2E 실행 계약: `tests/e2e/uiux/README.md`
- 시각 회귀 매트릭스: `tests/visual/uiux/matrix.json`

## 현재 상태

코드·문서·정적 계약과 GitHub Actions 품질 게이트는 준비됐다. 배포 브라우저, 테스트 계정, Playwright, 설치 PWA와 실기기 검증은 환경 차단으로 완료하지 못했다. 최종 판정은 `BLOCKED`다.
