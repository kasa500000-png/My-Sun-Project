# Stage 16 완료 보고

## 대상

- 홈 히어로, 주간 목표, 카드 계층, 핵심 CTA 도달성
- 관련 Issue: UX-HOME-001, UX-HOME-002

## 발견한 핵심 문제

1. 기존 모바일 히어로가 핵심 목표와 기록 CTA를 아래로 밀 수 있었다.
2. 주간 목표 카드와 다른 카드의 시각적 무게 차이가 작았다.
3. 카드 hover를 터치 환경에 적용하면 불필요한 상태가 생길 수 있다.

## 적용한 개선

1. 기기별 히어로 높이를 clamp로 제한했다.
2. 주간 목표 카드를 의미 기반 경계와 은은한 배경으로 우선 표시했다.
3. hover 폴리시는 정밀 포인터에서만 활성화했다.

## 변경 파일

- `app/uiux-dashboard.css`
- `app/layout.tsx`
- `docs/uiux/16-home-dashboard.md`
- `.logs/uiux/stage-16.md`

## 검증

- home source hierarchy: PASS
- calculation changes: 0
- CSS fallback for no-:has: PASS
- actual home screenshots: BLOCKED

## 남은 위험

- `:has()` 미지원 환경은 이미지 초점만 적용되고 카드 계층 폴리시는 생략된다.

## 커밋

- message: `uiux(16): clarify home dashboard hierarchy`

## 다음 단계

- Stage 17: 운동 탐색·목록·루틴 화면
