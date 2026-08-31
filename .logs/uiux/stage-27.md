# Stage 27 완료 보고

## 대상

- 버튼·탭·운동 행 피드백, busy 상태, 토스트, 모션 감소
- 관련 Issue: UX-MOTION-001, UX-STATE-002

## 발견한 핵심 문제

1. 화면별 transition과 scale 값이 분산돼 있었다.
2. 전역 토스트의 pill 형태는 긴 오류·안내 문장에 적합하지 않았다.
3. 모션 감소 규칙이 일부 컴포넌트에만 존재했다.

## 적용한 개선

1. 공통 인터랙션의 duration·easing·pressed 상태를 통합했다.
2. 토스트의 반경·줄 높이·그림자·작은 화면 폭을 개선했다.
3. 모든 새 모션에 reduced-motion과 forced-colors fallback을 제공했다.

## 변경 파일

- `app/uiux-motion.css`
- `app/layout.tsx`
- `docs/uiux/27-feedback-motion.md`
- `.logs/uiux/stage-27.md`

## 검증

- repeated animation added: NO
- reduced-motion source rule: PASS
- haptic: NOT APPLICABLE — 웹 PWA
- actual toast overlap: BLOCKED
- touch/hover browser: BLOCKED

## 커밋

- message: `uiux(27): unify feedback and respectful motion`

## 다음 단계

- Stage 28: 성능과 체감 속도
