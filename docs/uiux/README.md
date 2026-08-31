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
- [실제 브라우저·시각 회귀 검증](11-runtime-visual-validation.md)
- [30단계 진행 현황](30-stage-progress.md)
- [최종 보고서](final-report.md)
- [배포 체크리스트](release-checklist.md)

## 증거와 테스트

- 단계별 로그: `.logs/uiux/stage-01.md` ~ `stage-30.md`
- 구조화된 실화면 결과: `artifacts/uiux/runtime-validation-summary.json`
- 화면 증거 정책: `artifacts/uiux/README.md`
- 접근성 계약: `tests/uiux-accessibility.test.mjs`
- 성능 계약: `tests/uiux-performance.test.mjs`
- 전체 회귀 계약: `tests/uiux-regression.test.mjs`
- 실제 Chromium 화면 매트릭스: `tests/e2e/uiux/runtime-validation.pw.mjs`
- 대표 상호작용: `tests/e2e/uiux/interactions-validation.pw.mjs`
- 상세 axe 검사: `tests/e2e/uiux/axe-detail.pw.mjs`
- 비식별 API fixture: `tests/e2e/uiux/fixtures.mjs`
- 시각 diff 생성: `scripts/uiux-generate-diffs.mjs`

## 검증 결과

### 자동 품질

GitHub Actions `UIUX quality gate` 실행 `32347900483`에서 다음 항목을 모두 통과했다.

- 의존성 설치
- TypeScript
- ESLint
- 접근성·성능·전체 회귀 계약
- 기존 저장소 품질 검사
- Next.js production build

### 실제 브라우저

GitHub Actions `UIUX visual validation` 실행 `32347900482`에서 실제 Next.js production server와 Chromium을 사용했다.

- 화면 12개 × 뷰포트 6개
- before 72장
- after 72장
- diff 72장
- 대표 상호작용 5/5 PASS
- 개선 화면 가로 넘침 0건
- 개선 화면 40px 미만 인터랙티브 대상 0개
- axe 위반 0건
- 콘솔 오류·페이지 예외 0건

증거 Artifact:

- ID: `9398835039`
- 이름: `uiux-visual-evidence-9c7fc3e37cb0bd2e5af2e40c7aa4b99cd866f0d4`
- SHA-256: `68e3e3f152df92cfdcd27a292b6f823fb97a6501d708c8d730d394d2084cbf13`

## 현재 상태

# READY_WITH_MINOR_RISKS

UI·UX 코드, production build, 실제 Chromium 화면, 대표 상호작용과 자동 접근성 검증은 완료했다.

남은 범위는 보호된 Vercel Preview 본문, 실제 Supabase 테스트 계정의 인증·영구 저장, 설치 PWA 캐시 전환, Android/iOS 실기기와 VoiceOver/TalkBack이다. 따라서 PR은 제품 책임자의 Preview 시각 승인과 실제 테스트 계정 smoke test 전까지 Draft로 유지한다.
