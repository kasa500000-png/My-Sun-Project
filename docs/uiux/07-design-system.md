# 디자인 시스템 기반

## 적용 구조

- 기존 토큰과 화면 컴포넌트: `app/globals.css`
- UI·UX 개선용 의미 토큰과 공통 접근성 클래스: `app/uiux-foundation.css`
- 전역 로드 순서: `globals.css` → `uiux-foundation.css`

기존 화면의 시각 회귀를 줄이기 위해 기존 토큰을 제거하지 않고, 의미 기반 토큰과 공통 상태 표현을 확장한다.

## 색상 토큰

| 역할 | 토큰 | 사용 |
|---|---|---|
| 기본 텍스트 | `--mysun-ink` | 제목, 핵심 값, 기본 CTA |
| 본문 | `--mysun-body` | 설명·본문 |
| 보조 | `--mysun-muted` | 날짜·메타데이터 |
| 성공 | `--mysun-success` / `-surface` | 저장 완료, 선택, 안정 |
| 위험 | `--mysun-danger` / `-surface` | 오류, 삭제 |
| 주의 | `--mysun-warning` / `-surface` | 오프라인, 확인 필요 |
| 정보 | `--mysun-info` / `-surface` | 중립 안내, 계산 기준 |
| 포커스 | `--mysun-focus` | 키보드 포커스 |

## 간격·크기

- 간격: 4, 8, 12, 16, 20, 24, 32, 40px
- 입력·핵심 버튼: 48px
- 터치 대상: 최소 44px
- 폼 최대 폭: 560px
- 읽기 최대 폭: 768px
- 대시보드 최대 폭: 1200px
- Safe Area: 상·하·좌·우 환경변수 토큰화

## 상태 표현

`.mysun-status`에 `data-tone`을 사용한다.

```html
<div class="mysun-status" data-tone="danger" role="alert">...</div>
```

지원 톤:

- `success`
- `danger`
- `warning`
- `info`

색상과 함께 문구·아이콘·ARIA 역할을 사용한다.

## 입력 계약

- 힌트: `.mysun-field-hint`
- 오류: `.mysun-field-error`
- 오류 입력: `aria-invalid="true"`
- 연결: 입력의 `aria-describedby`가 힌트 또는 오류 ID를 가리킨다.

## 마이그레이션 원칙

1. 화면별 색상 값을 한 번에 모두 바꾸지 않는다.
2. 공통 상태·인증·오류 화면부터 의미 토큰을 적용한다.
3. 계산·API 로직과 함께 리팩터링하지 않는다.
4. 기존 클래스 제거는 전체 회귀 검증 후 별도 작업으로 남긴다.
