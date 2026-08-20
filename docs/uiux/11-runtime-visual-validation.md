# 실제 브라우저·시각 회귀 검증

## 1. 검증 판정

**Chromium 기반 실제 화면 검증: PASS**

- UI·UX 품질 게이트: PASS
- Next.js 프로덕션 빌드: PASS
- 기준·개선 화면 매트릭스: PASS
- 대표 사용자 상호작용: PASS
- axe WCAG 자동 검사: 검출 위반 0건
- 개선 화면 가로 넘침: 0건
- 40px 미만 인터랙티브 대상: 0건
- 개선 화면 콘솔 오류·페이지 예외: 0건
- before·after·diff 이미지: 각 72장 생성

이 판정은 GitHub Actions의 실제 Chromium과 Next.js 프로덕션 서버에서 얻은 결과다. 정적 코드 검사나 HTML fixture만으로 판정하지 않았다.

## 2. 검증 범위

### 화면

| ID | 화면 |
|---|---|
| AUTH-01 | 로그인 |
| AUTH-02 | 회원가입 |
| APP-01 | 홈 |
| APP-02 | 운동 기록 |
| APP-03 | 운동 일지 |
| APP-04 | 운동 분석 |
| APP-05 | 식단 |
| APP-06 | 내 정보·설정 |
| STATE-01 | 로딩 |
| STATE-02 | 오류 boundary |
| STATE-03 | 404 |
| STATE-04 | 오프라인 |

### 뷰포트

- 360 × 800
- 390 × 844
- 412 × 915
- 768 × 1024
- 1280 × 800
- 1440 × 900

12개 화면 × 6개 뷰포트로 기준 72장, 개선 72장, diff 72장을 생성했다.

## 3. 실행 환경

- 브라우저: Chromium
- 서버: `next build` 결과를 사용하는 Next.js production server
- 언어·시간대: `ko-KR`, `Asia/Seoul`
- 색상 모드: light
- 모션: reduced motion
- 서비스 워커: 화면 비교 중 차단
- 날짜: 2026-08-20로 고정
- 데이터: 운영 데이터가 아닌 비식별 deterministic fixture

인증 후 화면은 CI 전용 보호 라우트 `/uiux-visual`에서 실제 `FitLogApp` 컴포넌트를 렌더링했다. 라우트는 `UIUX_VISUAL_TEST=true`와 일치하는 헤더 토큰이 모두 있어야 열리며, 일반 Vercel 배포에서는 404를 반환한다.

## 4. 기준 대비 개선 결과

| 지표 | 기준 `main` | 개선 브랜치 | 결과 |
|---|---:|---:|---|
| 화면·뷰포트 조합 | 72 | 72 | 동일 조건 |
| 가로 넘침 | 2건 | 0건 | 해결 |
| 최대 가로 넘침 | 40px | 0px | 해결 |
| 40px 미만 인터랙티브 대상 | 154개 | 0개 | 해결 |
| axe 위반 그룹 | 8개 | 0개 | 해결 |
| axe serious 그룹 | 8개 | 0개 | 해결 |
| axe critical 그룹 | 0개 | 0개 | 유지 |
| 콘솔 오류 | 0개 | 0개 | 통과 |
| 페이지 예외 | 0개 | 0개 | 통과 |

### 기준 화면의 실제 문제

- 운동 기록 화면에서 360px 기준 40px, 390px 기준 10px 가로 넘침
- 작은 기간 탭, 달력 날짜, 아이콘 버튼 등 154개 대상이 40px 미만
- 비활성 탭·보조 텍스트의 색상 대비 부족
- 운동 분석의 가로 스크롤 근육 순위가 키보드 포커스로 진입 불가

### 실화면 검증 중 추가 수정

1. 식단 단백질 수치 `81/135g`가 모바일에서 말줄임되는 문제를 수정했다.
2. 비활성 탭과 기존 보조 색상의 대비를 AA 수준으로 강화했다.
3. 360px 운동·식단 달력 날짜 셀과 기간 탭을 44px 터치 기준으로 수정했다.
4. 비인터랙티브 가로 스크롤 영역을 키보드로 포커스하고 스크롤할 수 있게 했다.
5. full-page 캡처에서 `content-visibility`가 아래쪽 카드를 지연 렌더링하던 검증 하네스를 보완했다.
6. 높이가 다른 before·after 이미지도 아이보리 캔버스에 패딩해 모든 72개 diff를 생성했다.

## 5. 대표 상호작용 결과

390 × 844에서 다음 흐름을 실제 Chromium으로 조작했다.

| 흐름 | 결과 |
|---|---|
| 회원가입 비밀번호 불일치 → 필드 오류 표시 | PASS |
| 비밀번호 표시·숨기기 | PASS |
| 홈 → 운동 기록 진입 | PASS |
| 하체 범위 선택 → 스쿼트 검색 → 입력 모달 열기 → Escape 닫기 | PASS |
| 내 정보 모달 → 배경 클릭 방지 → Escape 복구 | PASS |

API 응답은 운영 계정 대신 메모리 기반 fixture로 제공했다. 따라서 UI의 로딩·검색·모달·오류·복귀 동작은 실제 브라우저에서 검증했지만, 실제 Supabase RLS와 영구 저장 결과를 검증한 것은 아니다.

## 6. 접근성 결과

390 × 844에서 로그인, 회원가입, 홈, 운동 기록, 일지, 분석, 식단, 설정, 로딩, 404, 오프라인 화면을 axe로 상세 검사했다.

최종 결과:

- WCAG A·AA·2.1 AA·2.2 AA 태그 기준 위반: 0건
- color-contrast: 0건
- scrollable-region-focusable: 0건
- critical: 0건
- serious: 0건

자동 검사 외에 다음은 코드와 Chromium 동작으로 함께 확인했다.

- skip link
- visible focus
- 로그인 tablist·tabpanel 연결
- 필드 오류 `aria-invalid`·`aria-describedby`
- 상태 live region
- 44px 터치 대상
- reduced motion
- forced-colors·고대비 CSS fallback

VoiceOver·TalkBack의 실제 음성 출력은 별도 실기기 점검이 필요하다.

## 7. 화면 증거

- GitHub Actions 실행: `32347900482`
- 검증 커밋: `d9156b76decb3a39d6128f013937b3de56a7b9bf`
- 증거 Artifact ID: `9398835039`
- Artifact 이름: `uiux-visual-evidence-9c7fc3e37cb0bd2e5af2e40c7aa4b99cd866f0d4`
- Artifact SHA-256: `68e3e3f152df92cfdcd27a292b6f823fb97a6501d708c8d730d394d2084cbf13`

증거 패키지에는 다음이 포함된다.

```text
artifacts/uiux/runtime/
├─ before/     # 72 PNG + 뷰포트별 JSON
├─ after/      # 72 PNG + 상호작용·axe JSON
├─ diff/       # 72 PNG
└─ reports/
   └─ diff-summary.json
```

## 8. Vercel 상태

동일 커밋의 Vercel 배포 상태는 `success`다.

다만 연결된 Vercel 권한으로 보호된 Preview 본문을 직접 열 수 없어, Vercel URL 자체에서 동일 매트릭스를 반복하지 못했다. 브라우저 검증은 동일 커밋의 Next.js production build를 GitHub Actions 안에서 실행해 수행했다.

## 9. 남은 수동 검증

- 실제 Supabase 테스트 계정 로그인·세션 복원
- 실제 DB를 이용한 생성·수정·삭제 smoke test
- 설치 PWA의 service worker `v4 → v5` 캐시 전환
- Android 시스템 뒤로 가기와 실제 소프트 키보드
- VoiceOver 또는 TalkBack
- 보호된 Vercel Preview 본문 검토

## 10. 최종 평가

**UI·UX 코드 및 실제 Chromium 화면: VERIFIED**

**프로덕션 배포 판정: READY_WITH_MINOR_RISKS**

남은 위험은 화면 품질이나 자동 빌드 문제가 아니라 실제 인증·영구 저장·설치 PWA·보조기술 통합에 한정된다. PR은 제품 책임자의 Preview 확인과 테스트 계정 smoke test 전까지 Draft로 유지한다.
