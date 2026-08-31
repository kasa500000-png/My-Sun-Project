# UI·UX 배포 체크리스트

## 저장소·변경 범위

- [x] 별도 브랜치 `codex/uiux-30-stage-improvement` 사용
- [x] 30단계 독립 커밋 기록
- [x] 공식 제품명 ‘마이썬 운동일지’ 사용
- [x] DB 마이그레이션 없음
- [x] API 요청·응답 계약 변경 없음
- [x] 운동·식단 계산 로직 변경 없음
- [x] 운영 계정 데이터 조작 없음

## 코드 품질

검증 기준: GitHub Actions `UIUX quality gate` 실행 `32347900483`.

- [x] `npm ci` 성공
- [x] `npm run typecheck` 통과
- [x] `npm run lint` 통과
- [x] 접근성 계약 테스트 통과
- [x] 성능 계약 테스트 통과
- [x] 전체 회귀 계약 테스트 통과
- [x] `npm run quality` 통과
- [x] `npm run build` 통과
- [x] GitHub Actions `UIUX quality gate` 통과

## 실제 Chromium 핵심 사용자 여정

검증 기준: GitHub Actions `UIUX visual validation` 실행 `32347900482`.

- [x] 회원가입 비밀번호 불일치 오류 표시
- [x] 비밀번호 표시·숨기기
- [x] 홈 → 운동 기록 진입
- [x] 하체 범위 → 스쿼트 검색 → 운동 입력 모달 열기·Escape 닫기
- [x] 내 정보 모달 배경 클릭 방지·Escape 복구
- [x] 로그인·회원가입 공개 화면 렌더링
- [x] 홈·운동·일지·분석·식단·내 정보 렌더링
- [x] 로딩·오류·404·오프라인 렌더링
- [ ] 실제 Supabase 테스트 계정 로그인·세션 복원
- [ ] 실제 DB 운동 기록 저장·수정·삭제
- [ ] 실제 DB 식단 기록 저장·수정·삭제
- [ ] 브라우저·Android 시스템 뒤로 가기 실기기 검증

## 시각·반응형

- [x] 360×800
- [x] 390×844
- [x] 412×915
- [x] 768×1024
- [x] 1280×800
- [x] 1440×900
- [x] 기준 화면 72장
- [x] 개선 화면 72장
- [x] 전후 diff 72장
- [x] 개선 화면 가로 넘침 0건
- [x] 40px 미만 인터랙티브 대상 0개
- [x] 긴 한국어와 큰 영양 목표값 표시
- [x] 모바일 달력과 운동 목록 전체 렌더링
- [ ] 실제 모바일 소프트 키보드가 열린 상태
- [ ] 200%·400% 브라우저 확대 수동 검토

## 접근성

- [x] 브라우저 확대 허용
- [x] Skip link
- [x] 인증 폼 label·자동완성·필드 오류 연결
- [x] 상태 live region
- [x] 고대비·forced-colors·reduced-motion 코드 계약
- [x] 키보드 진입 가능한 비인터랙티브 가로 스크롤 영역
- [x] 44px 터치 대상 기준
- [x] axe 대표 화면 11개 위반 0건
- [x] axe serious·critical 위반 0건
- [x] 대표 모달 Escape 복구
- [ ] 모든 모달의 초기 포커스·포커스 트랩·복귀 수동 검토
- [ ] VoiceOver 또는 TalkBack 확인

## PWA·데이터 보호

- [x] API·auth 캐시 제외
- [x] 인증 후 HTML 네비게이션 캐시 제외
- [x] 공개 로그인·오프라인만 HTML 캐시
- [x] 서비스 워커 캐시 정책 정적 계약 테스트
- [ ] 설치 PWA `v4 → v5` 캐시 실제 마이그레이션
- [ ] 설치 PWA 온라인·오프라인 전환
- [ ] 서비스 워커 업데이트·롤백 실기기 검증

## 배포·롤백

- [x] Vercel 배포 상태 `success`
- [x] Next.js production build를 실제 production server로 실행
- [x] 실제 Chromium 화면 검증
- [x] 오류·콘솔 예외 0건
- [x] 롤백 절차 문서화
- [ ] 보호된 Vercel Preview 본문 확인
- [ ] Vercel 실제 환경변수 존재 확인
- [ ] 실제 테스트 계정 통합 smoke test
- [ ] 제품 책임자 시각 승인

## 증거

- 실화면 실행: `32347900482`
- 품질 실행: `32347900483`
- 실화면 검증 커밋: `d9156b76decb3a39d6128f013937b3de56a7b9bf`
- 증거 Artifact ID: `9398835039`
- Artifact SHA-256: `68e3e3f152df92cfdcd27a292b6f823fb97a6501d708c8d730d394d2084cbf13`

## 현재 병합 판정

**READY_WITH_MINOR_RISKS — Draft 유지.**

코드 품질과 실제 Chromium UI·UX 검증은 통과했다. `main` 병합 전에는 보호된 Vercel Preview의 제품 시각 승인과 실제 Supabase 테스트 계정을 이용한 인증·영구 저장 smoke test를 추가로 수행한다.
