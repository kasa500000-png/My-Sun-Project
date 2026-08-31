# Stage 21 완료 보고

## 대상

- 운동 입력, 운동 메모, 식단 숫자 입력, 모달 키보드·저장 footer
- 관련 Issue: UX-WORKOUT-002, UX-DIET-001, UX-DIET-002

## 발견한 핵심 문제

1. 360px에서 2~4열 숫자 입력이 압축될 수 있었다.
2. 긴 모달에서 키보드와 하단 CTA 사이의 스크롤 여백이 부족할 수 있었다.
3. disabled·busy·invalid 상태가 공통 폼 계약으로 정리되지 않았다.

## 적용한 개선

1. 작은 화면 입력 그리드를 1~2열로 재배치했다.
2. 모달 스크롤, sticky footer, Safe Area와 키보드 여백을 표준화했다.
3. 숫자 정렬과 disabled·invalid 상태를 통일했다.

## 변경 파일

- `app/uiux-forms.css`
- `app/layout.tsx`
- `docs/uiux/21-record-forms.md`
- `.logs/uiux/stage-21.md`

## 검증

- workout/diet calculation changes: 0
- source responsive rules: PASS
- mobile keyboard: BLOCKED
- save/edit/delete: NOT RUN — 테스트 계정 없음
- actual browser: BLOCKED

## 남은 위험

- 구조 기반 Tailwind class selector는 핵심 컴포넌트 마크업 변경 시 재검토가 필요하다.

## 커밋

- message: `uiux(21): harden mobile workout and diet forms`

## 다음 단계

- Stage 22: 통계·성과·복기 시각화
