# 실행 환경 및 기술 스택

## 감지된 기술 스택

| 항목 | 확인 결과 |
|---|---|
| 웹 프레임워크 | Next.js 16.2.7, App Router |
| UI 런타임 | React 18.3.1 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 3.4.4 + `app/globals.css` 디자인 토큰 |
| 인증·데이터 | Supabase SSR / Supabase JS |
| 이미지 처리 | Sharp, 브라우저 Canvas 기반 식단 이미지 압축 |
| PWA | `manifest.webmanifest`, `sw.js`, ServiceWorkerRegister |
| 상태 관리 | 화면 단위 React hooks (`useState`, `useMemo`, `useEffect`) |
| 라우팅 | Next.js 라우트 + 루트 화면 내부 탭 상태 및 `?tab=` |
| 테스트 | Node test runner, TypeScript strip-types |
| 품질 검사 | TypeScript, ESLint, 자체 `quality-check.mjs`, Next build |
| 배포 | README와 메타데이터상 GitHub main → Vercel |

## 주요 실행 명령

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run quality
npm run build
npm run validate
```

## 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `XAI_API_KEY`
- `XAI_MODEL`
- `XAI_VISION_MODEL`

서버 비밀값은 브라우저에 노출하지 않는다. UI 검증에서 실제 값을 출력하거나 스크린샷에 포함하지 않는다.

## 구조 관찰

- `components/FitLogApp.tsx` 한 파일에 홈, 운동 입력, 기록, 분석, 식단, 프로필 화면과 대량의 도메인 데이터가 집중되어 있다.
- `app/globals.css`에는 의미 기반 토큰과 공통 클래스가 있으나 화면 내부 하드코딩 Tailwind 값이 병존한다.
- 공개 진입은 `/login`, 인증 후 핵심 앱은 `/`의 내부 탭 구조다.
- 오류, 로딩, 오프라인, 404 화면이 별도 라우트로 존재한다.

## 안전 영역

- 토큰, 공통 상태 화면, 로그인 표현 계층, 접근성 속성, 반응형·Safe Area, 오류 복구 문구, 정적 테스트.

## 금지 영역

- 계산식, API 스키마, DB 마이그레이션, 인증 정책, RLS, 운영 데이터, AI 분석 계약을 UI 목적만으로 변경하지 않는다.

## 실행 상태

- GitHub 저장소 읽기·쓰기: 가능
- 작업 브랜치 생성: 완료
- 배포 프로젝트 관리 조회: 현재 차단
- 외부 배포 URL 직접 브라우저 접근: 현재 실행 환경에서 차단
- 로컬 전체 의존성 설치: 외부 네트워크 제약으로 미수행
- 정적 소스 계약 검증: 수행 가능
