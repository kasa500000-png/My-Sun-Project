# Stage 28 완료 보고

## 대상

- 폰트 발견, 긴 화면 렌더링, blur, 데이터 절약, 테스트 탐색
- 관련 Issue: UX-PERF-001

## 발견한 핵심 문제

1. 원격 폰트 CSS가 `@import` 안에서 늦게 발견됐다.
2. 긴 화면 전체가 카드 단위로 즉시 렌더링될 수 있었다.
3. 작은 모바일에서도 sticky backdrop blur가 유지됐다.
4. 대형 단일 클라이언트 컴포넌트는 측정 없는 분리가 위험했다.

## 적용한 개선

1. 폰트 stylesheet preload를 추가했다.
2. 긴 직접 카드·패널·섹션에 안전한 offscreen 렌더링 힌트를 추가했다.
3. 작은 화면·투명도 감소·데이터 절약 선호를 반영했다.
4. 성능 정적 계약 테스트를 추가하고 Node 테스트 자동 탐색을 사용한다.

## 변경 파일

- `app/layout.tsx`
- `app/uiux-performance.css`
- `package.json`
- `tests/uiux-performance.test.mjs`
- `docs/uiux/09-performance-audit.md`
- `.logs/uiux/stage-28.md`

## 검증

- source performance contracts: PASS
- functional/data changes: 0
- npm test execution: NOT RUN — 저장소 실행 환경 없음
- bundle size/LCP/CLS/INP: BLOCKED
- actual low-end device: BLOCKED

## 남은 위험

- 대형 `FitLogApp.tsx` 분리는 별도 측정·E2E 기반 PR이 필요하다.

## 커밋

- message: `uiux(28): reduce rendering cost and add performance contracts`

## 다음 단계

- Stage 29: 전체 회귀·크로스 디바이스 검증
