# 성능과 체감 속도 감사

## 확인된 구조

- Next.js App Router와 단일 대형 클라이언트 컴포넌트
- WebP 히어로·근육 카드 자산
- 운동 행의 기존 `content-visibility: auto`
- 브라우저 Canvas 기반 식단 이미지 압축
- API 타임아웃과 서비스 워커 정적 자산 캐시
- Pretendard 원격 CSS `@import`

## 적용한 개선

### 폰트 발견

중첩 CSS `@import`가 해석되기 전에 Pretendard stylesheet 요청을 시작하도록 레이아웃 head에 preload를 추가했다. 기존 preconnect와 시스템 폰트 fallback은 유지한다.

### 오프스크린 렌더링

지원 브라우저에서 긴 화면의 직접 카드·패널·상세 섹션에 `content-visibility: auto`와 intrinsic size를 적용했다. 인쇄에서는 모든 콘텐츠를 다시 렌더링한다.

### 저사양·사용자 선호

- 389px 이하 또는 투명도 감소 선호에서 sticky blur 제거
- 데이터 절약 선호에서 대형 배경 이미지를 생략하고 브랜드 그라데이션 사용
- 인증 후 HTML 캐시 금지는 Stage 23에서 적용

### 자동 계약

`tests/uiux-performance.test.mjs`를 추가하고 `npm test`가 모든 Node 테스트를 자동 탐색하도록 변경했다.

## 변경하지 않은 고위험 영역

`components/FitLogApp.tsx`는 약 287KB의 단일 클라이언트 파일이다. 화면별 동적 import와 도메인 목록 분리는 번들 크기에 가장 큰 영향을 줄 가능성이 있지만, 인증 후 전체 흐름·상태 공유·테스트 계정 없이 한 번에 분리하면 회귀 위험이 높다. 이번 브랜치에서는 실제 측정 환경이 마련된 후 별도 구조 PR로 수행하도록 남긴다.

## 측정 상태

| 항목 | 개선 전 | 개선 후 | 상태 |
|---|---:|---:|---|
| 초기 화면 표시 | 미측정 | 미측정 | BLOCKED |
| 주요 콘텐츠 표시 | 미측정 | 미측정 | BLOCKED |
| 탭 전환 | 미측정 | 미측정 | BLOCKED |
| 긴 목록 스크롤 | 미측정 | 미측정 | BLOCKED |
| 번들 크기 | 미측정 | 미측정 | BLOCKED |
| 네트워크 중복 | 소스 감사만 | 소스 감사만 | PARTIAL |

실제 측정 없이 수치 개선을 주장하지 않는다.
