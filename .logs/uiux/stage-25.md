# Stage 25 완료 보고

## 대상

- 앱 오류, 404, 오프라인, 화면 내부 빈 상태
- 관련 Issue: UX-STATE-001, UX-STATE-002

## 발견한 핵심 문제

1. 오류·404·오프라인이 각기 다른 카드 마크업과 행동 구조를 사용했다.
2. 오류 직후 재시도가 중복 저장으로 이어질 가능성을 설명하지 않았다.
3. 404가 데이터 영향 여부를 알려주지 않았다.

## 적용한 개선

1. 앱 오류와 404를 공통 `AppStatePage`로 교체했다.
2. 데이터 영향·복구 행동·오류 digest의 정보 순서를 표준화했다.
3. 오프라인 화면과 같은 시각·접근성 계약을 사용한다.

## 변경 파일

- `app/error.tsx`
- `app/not-found.tsx`
- `docs/uiux/25-empty-error-states.md`
- `.logs/uiux/stage-25.md`

## 검증

- shared state component use: PASS
- retry/home actions present: PASS
- raw exception exposure: NO
- actual error boundary: BLOCKED
- actual 404/offline browser: BLOCKED

## 남은 위험

- 루트 레이아웃 자체 오류를 위한 `global-error.tsx`는 현재 저장소 범위에 없으며 별도 검증이 필요하다.

## 커밋

- message: `uiux(25): standardize empty error and offline recovery`

## 다음 단계

- Stage 26: 접근성 전면 개선과 정적 계약 테스트
