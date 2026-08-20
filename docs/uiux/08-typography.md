# 타이포그래피와 정보 계층

## 스케일

| 역할 | 클래스 | 크기·특성 |
|---|---|---|
| 브랜드·히어로 | `.mysun-display` | 32~52px fluid, 700 |
| 화면 제목 | `.mysun-page-title` | 24~32px fluid, 700 |
| 섹션 제목 | `.mysun-section-title` | 17~19px fluid, 700 |
| 본문 | `.mysun-body-copy` | 16px, 1.65 line-height |
| 메타 | `.mysun-meta` | 14px, muted |
| 라벨 | `.mysun-label` | 14px, 600 |
| 핵심 숫자 | `.mysun-metric` | tabular/lining 숫자 |
| 긴 설명 | `.mysun-prose` | 16px, 1.75 line-height |

## 적용 원칙

- 페이지 제목과 섹션 제목을 크기만이 아니라 여백·굵기·맥락으로 구분한다.
- 운동 시간, 볼륨, 칼로리, 영양값은 `.mysun-metric`으로 자릿수 흔들림을 줄인다.
- 보조 설명을 무조건 작은 회색 글자로 만들지 않는다.
- 긴 한국어 제목은 balance wrapping을 사용하되 입력·수치에는 강제 줄바꿈을 적용하지 않는다.
- 389px 이하에서 제목을 한 단계 줄여 CTA와 데이터 공간을 보존한다.

## 접근성

- 브라우저 확대와 시스템 글자 크기를 막지 않는다.
- 본문은 기본 16px를 유지한다.
- 큰 글자에서 잘림 대신 줄바꿈·세로 확장을 허용한다.
