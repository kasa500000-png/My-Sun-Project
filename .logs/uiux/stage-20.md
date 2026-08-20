# Stage 20 완료 보고

## 대상

- 주간 운동 목표, 누적 부하, 식단 자동 계산·직접 입력
- 관련 Issue: UX-DIET-003, UX-ANALYSIS-001

## 발견한 핵심 문제

1. 식단 목표의 계산 근거와 미리보기 카드가 일반 안내와 비슷한 무게였다.
2. 360px에서 칼로리·단백질 입력과 2개 CTA가 압축될 수 있었다.
3. 목표 진행은 시각적 막대만 있고 자동·수동 값의 출처 구분은 추가 검증이 필요하다.

## 적용한 개선

1. 계산 근거 안내와 자동 계산 미리보기를 명확히 분리했다.
2. 작은 화면 목표 입력과 CTA를 1열로 전환했다.
3. 진행 막대의 대비·모션·고대비 fallback을 정비했다.

## 변경 파일

- `app/uiux-goals.css`
- `app/layout.tsx`
- `docs/uiux/20-goals-and-load.md`
- `.logs/uiux/stage-20.md`

## 검증

- calculation logic changes: 0
- responsive source rule: PASS
- reduced-motion source rule: PASS
- goal save runtime: NOT RUN — 테스트 계정 없음
- actual browser: BLOCKED

## 남은 위험

- 진행 막대의 ARIA progressbar 역할은 핵심 컴포넌트 DOM 변경과 실화면 테스트 후 추가해야 한다.

## 커밋

- message: `uiux(20): clarify goals and calculated values`

## 다음 단계

- Stage 21: 운동·식단 기록 폼
