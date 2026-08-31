# 접근성 감사

## 현재 코드 수준 결과

| 영역 | 상태 | 근거 |
|---|---|---|
| 브라우저 확대 | CODE_VERIFIED | maximumScale 5, userScalable true |
| 본문 건너뛰기 | CODE_VERIFIED | 전역 skip link와 focus target |
| 인증 폼 | CODE_VERIFIED | 이메일 목적, 자동완성, 필드 오류 연결, 비밀번호 토글 |
| 인증 탭 | CODE_VERIFIED | tablist/tab/tabpanel, selected, controls, labelledby, roving tabIndex |
| 오류·상태 | CODE_VERIFIED | alert/status live region, atomic message, 공통 상태 페이지 |
| 키보드 포커스 | CODE_VERIFIED | 3px focus-visible, 고대비·forced-colors fallback |
| 모션 감소 | CODE_VERIFIED | 로딩·인증·목표·카드 모션 정지 |
| Safe Area·키보드 | CODE_VERIFIED | viewport-fit cover, safe-area 토큰, 모바일 입력 16px |
| 모달 포커스 트랩 | OPEN | 대형 핵심 컴포넌트의 실제 DOM 변경 필요 |
| 차트 대체 정보 | PARTIAL | 텍스트 범례 존재, 보조기술 실제 검증 필요 |
| 스크린리더 | BLOCKED | VoiceOver·TalkBack 실행 환경 없음 |
| 200%·400% 확대 | BLOCKED | 실제 브라우저 실행 환경 없음 |

## 대비 측정

| 조합 | 대비비 | 판정 |
|---|---:|---|
| `#242124` / `#fffdfb` | 15.70:1 | AAA 본문 |
| `#4b4541` / `#fffdfb` | 9.29:1 | AAA 본문 |
| `#7a7470` / `#fffdfb` | 4.54:1 | AA 본문 경계 통과 |
| 성공 `#1f6848` / `#edf8f1` | 6.16:1 | AA 본문 |
| 오류 `#9b3140` / `#fff0f1` | 6.53:1 | AA 본문 |
| 주의 `#70460f` / `#fff6df` | 7.58:1 | AAA 본문 |
| 정보 `#254b59` / `#eef7f9` | 8.66:1 | AAA 본문 |
| 포커스 `#8f4b5a` / `#fffdfb` | 6.23:1 | 비텍스트 대비 충족 |

기존 placeholder `#958b86`은 약 3.28:1이었으며 `#756b66`으로 강화해 약 5.11:1을 확보했다.

## 자동 계약 테스트

`tests/uiux-accessibility.test.mjs`는 외부 브라우저 의존성 없이 다음 회귀를 검사한다.

- 확대 허용 viewport
- skip link
- 인증 탭·필드 ARIA
- live region
- 공통 상태 페이지
- 포커스·고대비·모션 감소·Safe Area
- 인증 후 HTML을 캐시하지 않는 서비스 워커 정책

실행:

```bash
npm test
```

`npm run validate`에도 포함된다.

## 실제 검증 대기

- 키보드 탭 순서와 모달 포커스 복귀
- VoiceOver·TalkBack 읽기 순서
- 200%·400% 확대
- 색각 시뮬레이션
- axe 자동 검사
- Windows 고대비 모드

해당 항목은 실행하지 않았으므로 WCAG 2.2 AA 전체 완료라고 주장하지 않는다.
