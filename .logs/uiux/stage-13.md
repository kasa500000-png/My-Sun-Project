# Stage 13 완료 보고

## 대상

- route loading, 세션·홈 데이터 준비 상태, 스켈레톤
- 관련 Issue: UX-PERF-001, UX-LAYOUT-001

## 발견한 핵심 문제

1. 기존 스켈레톤은 실제 홈 계층을 충분히 예고하지 않았다.
2. 작은 모바일에서도 지표 카드가 2열로 고정됐다.
3. 시각 스켈레톤의 접근성 노출 범위를 더 명확히 할 수 있었다.

## 적용한 개선

1. 헤더·히어로·지표 카드 구조를 반영한 스켈레톤으로 교체했다.
2. 시각 요소를 `aria-hidden`, 상태 문구를 별도 live region으로 분리했다.
3. 작은 화면 1열, reduced-motion 정지 규칙을 추가했다.

## 변경 파일

- `app/loading.tsx`
- `app/uiux-loading.css`
- `app/layout.tsx`
- `docs/uiux/13-loading.md`
- `.logs/uiux/stage-13.md`

## 검증

- semantic loading contract: PASS
- reduced-motion source rule: PASS
- layout shift measurement: BLOCKED
- slow network browser test: BLOCKED

## 커밋

- message: `uiux(13): align loading skeleton with home hierarchy`

## 다음 단계

- Stage 14: 로그인·회원가입·인증 복구 UX
