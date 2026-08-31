# Stage 06 완료 보고

## 대상

- 브랜드 인상, 정보 위계, 카드·색상·모션·반응형 원칙
- 관련 Issue: UX-HOME-002, UX-MOTION-001

## 발견한 핵심 문제

1. 공통 방향 없이 화면별로 개선하면 카드·색상·밀도가 다시 분산될 수 있다.
2. 운동·식단 수치는 장식보다 기간·단위·추정 여부가 먼저 보여야 한다.
3. 기존 사용자에게 익숙한 탭과 기록 흐름을 보존해야 한다.

## 적용한 개선

1. ‘꾸준한 기록과 회복 가능한 습관’이라는 제품 인상을 정의했다.
2. 오늘의 행동, 복구 가능한 입력, 숫자 맥락, 카드·색상·모션 원칙을 명문화했다.
3. 모바일·태블릿·데스크톱의 밀도와 크기 방향을 고정했다.

## 변경 파일

- `docs/uiux/06-design-principles.md`
- `.logs/uiux/stage-06.md`

## 검증

- alignment with existing DESIGN.md: PASS
- brand identity preserved: PASS
- runtime visual review: BLOCKED

## 커밋

- message: `uiux(06): define calm record-first design principles`

## 다음 단계

- Stage 07: 디자인 토큰과 테마 기반 정비
