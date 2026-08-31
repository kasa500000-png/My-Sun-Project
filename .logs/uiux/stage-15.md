# Stage 15 완료 보고

## 대상

- 첫 실행, 온보딩, 권한 요청 범위
- 관련 Issue: 신규 기능 생성 방지

## 발견한 핵심 문제

1. 프롬프트의 온보딩·푸시 권한 항목은 현재 제품에 존재하지 않는다.
2. 존재하지 않는 기능을 단계 충족용으로 추가하면 제품 범위와 데이터 흐름을 왜곡한다.

## 적용한 개선

1. 별도 온보딩을 만들지 않고 제품 가치 설명을 로그인 화면에 통합했다.
2. 현재 앱이 요청하는 사용자 선택과 향후 권한 요청 원칙을 문서화했다.
3. 신규 제품 제안은 이번 브랜치 범위 밖으로 분리했다.

## 변경 파일

- `docs/uiux/15-onboarding-permissions.md`
- `.logs/uiux/stage-15.md`

## 검증

- permission API source audit: PASS
- invented feature count: 0
- native permission dialog: NOT APPLICABLE

## 커밋

- message: `uiux(15): scope first-run and permission experience`

## 다음 단계

- Stage 16: 홈 대시보드 개선 기준과 전역 폴리시 적용
