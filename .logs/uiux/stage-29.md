# Stage 29 완료 보고

## 대상

- 전체 실제 Chromium 회귀
- 모바일·태블릿·데스크톱 시각 매트릭스
- 대표 키보드·폼·모달 흐름
- axe WCAG 검사
- before·after·diff 증거
- 관련 Issue: UX-RUNTIME-001, UX-LAYOUT-001, UX-A11Y-001

## 발견한 핵심 문제

실제 기준 화면에서 다음 문제가 확인됐다.

1. 운동 기록 화면이 360×800에서 40px, 390×844에서 10px 가로로 넘쳤다.
2. 40px 미만 인터랙티브 대상이 154개였다.
3. axe serious 위반 그룹이 8개였다.
4. 비활성 탭과 보조 텍스트 대비가 AA 기준에 미달했다.
5. 근육 순위 가로 스크롤 영역을 키보드로 진입할 수 없었다.
6. 식단 단백질 `현재/목표` 값이 360px에서 말줄임됐다.
7. full-page 캡처에서 `content-visibility` 때문에 아래쪽 카드가 지연 렌더링될 수 있었다.

## 적용한 개선

1. 모바일 운동 화면 가로 넘침을 제거했다.
2. 기간 탭, 달력 날짜와 아이콘 버튼을 44px 터치 기준으로 보정했다.
3. 보조·비활성·성공·위험 텍스트 색상을 AA 대비로 정리했다.
4. 비인터랙티브 가로 스크롤 영역에 조건부 키보드 포커스와 접근 가능한 이름을 제공했다.
5. 모바일 식단 목표값을 말줄임 없이 표시했다.
6. CI 전용 보호 라우트에서 실제 `FitLogApp`을 렌더링하고, 운영 데이터 대신 비식별 deterministic fixture를 사용했다.
7. 기준·개선 화면 높이가 달라도 아이보리 캔버스에 패딩해 diff를 생성하도록 개선했다.

## 변경 파일

- `.github/workflows/uiux-visual-validation.yml`
- `playwright.uiux.config.mjs`
- `lib/uiux-visual-gate.ts`
- `app/uiux-visual/page.tsx`
- `app/uiux-visual/error/page.tsx`
- `app/uiux-visual/loading/page.tsx`
- `tests/e2e/uiux/fixtures.mjs`
- `tests/e2e/uiux/runtime-validation.pw.mjs`
- `tests/e2e/uiux/interactions-validation.pw.mjs`
- `tests/e2e/uiux/axe-detail.pw.mjs`
- `scripts/uiux-generate-diffs.mjs`
- `components/ScrollableRegionAccessBridge.tsx`
- `app/layout.tsx`
- `app/uiux-accessibility.css`
- `app/uiux-data.css`
- `.logs/uiux/stage-29.md`

## 검증

- 품질 게이트 실행: `32347900483` — PASS
- 실화면 실행: `32347900482` — PASS
- 기준 production build: PASS
- 개선 production build: PASS
- 기준 화면 72장: PASS
- 개선 화면 72장: PASS
- diff 72장: PASS
- 대표 상호작용 5개: PASS
- 개선 화면 가로 넘침: 0건
- 개선 화면 40px 미만 인터랙티브 대상: 0개
- axe 위반: 0건
- 콘솔 오류·페이지 예외: 0건
- Vercel 배포 상태: success

## 전후 증거

- Before: `artifacts/uiux/runtime/before/`
- After: `artifacts/uiux/runtime/after/`
- Diff: `artifacts/uiux/runtime/diff/`
- Artifact ID: `9398835039`
- Artifact SHA-256: `68e3e3f152df92cfdcd27a292b6f823fb97a6501d708c8d730d394d2084cbf13`

## 남은 위험

- 인증 후 화면은 실제 컴포넌트를 사용했지만 API는 비식별 fixture였다.
- 보호된 Vercel Preview 본문은 현재 연결 권한으로 열지 못했다.
- 설치 PWA, Android/iOS 실기기, VoiceOver/TalkBack은 수동 검증이 필요하다.

## 커밋

주요 실화면 검증·수정 범위는 `d9156b76decb3a39d6128f013937b3de56a7b9bf`까지 반영했다.

## 다음 단계

- Stage 30: 실제 브라우저 증거를 최종 보고서·배포 판정·PR에 반영
