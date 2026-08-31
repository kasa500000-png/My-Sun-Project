# Stage 11 완료 보고

## 대상

- 전체 상태 페이지, inline 상태, 필드 도움말·오류
- 관련 Issue: UX-STATE-001, UX-AUTH-003, UX-WORKOUT-002

## 발견한 핵심 문제

1. 오류·404·오프라인이 유사한 카드 마크업을 각자 보유했다.
2. 상태 메시지의 ARIA live 정책과 색상 톤이 화면별로 달라질 수 있었다.
3. 필드 오류를 연결할 공통 최소 컴포넌트가 없었다.

## 적용한 개선

1. `AppStatePage`, `StatusMessage`, `FieldMessage`를 추가했다.
2. 상태 페이지의 반응형·Safe Area·행동 레이아웃을 공통화했다.
3. 오류와 안내에 일관된 role·live region 계약을 제공했다.

## 변경 파일

- `components/ui/AppStatePage.tsx`
- `components/ui/StatusMessage.tsx`
- `components/ui/FieldMessage.tsx`
- `app/uiux-components.css`
- `app/layout.tsx`
- `docs/uiux/11-component-contracts.md`
- `.logs/uiux/stage-11.md`

## 검증

- component type review: PASS
- server/client compatibility review: PASS
- typecheck/build: NOT RUN — 의존성 실행 환경 차단
- actual browser: BLOCKED

## 남은 위험

- 모달 Dialog 표준화는 대형 핵심 컴포넌트 회귀 위험 때문에 Stage 26의 후속 범위로 남는다.

## 커밋

- message: `uiux(11): standardize shared state components`

## 다음 단계

- Stage 12: 내비게이션과 본문 진입 개선
