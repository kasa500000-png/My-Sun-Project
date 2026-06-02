# 마이썬 운동일지

모바일 사용을 우선으로 만든 개인 운동 일지 웹앱입니다.

## 기능

- 이메일과 비밀번호 기반 회원가입/로그인
- 로그인 후 운동 일지 진입
- 루틴, 세트, 무게, 횟수, 시간 기록
- 주간 근육 밸런스 분석
- 클라우드 기반 운동 기록 저장
- 모바일 웹뷰 중심의 한국어 UI

## 시작

```bash
npm install
npm run dev
```

`.env.local`에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

운동 기록을 저장하기 전에 Supabase SQL Editor에서 `supabase/migration-fit-log.sql`을 실행합니다.

DB URL을 `.env.local`에 넣은 경우 아래 명령으로도 실행할 수 있습니다.

```bash
npm run db:migrate
```

`SUPABASE_DB_URL`은 Supabase Postgres 직접 연결 문자열입니다. Vercel 클라이언트 환경변수나 `NEXT_PUBLIC_` 값으로 노출하지 말고, 로컬 또는 서버 환경변수로만 설정합니다. 이 값이 없으면 `npm run db:migrate`는 실행되지 않습니다.

## 검증

배포 전에는 아래 명령을 기준으로 확인합니다.

```bash
npm run validate
```

검증에는 TypeScript, ESLint, PWA/보안/근육 카드 자산 품질 체크, Next.js 빌드가 포함됩니다.

## 배포

GitHub `main` 브랜치에 푸시하면 Vercel 프로덕션 배포가 실행됩니다.

배포 후 확인할 항목:

- `/login` 페이지가 정상 렌더링되는지
- `/manifest.webmanifest`가 `application/manifest+json`으로 응답하는지
- `/sw.js`가 `no-store`와 `Service-Worker-Allowed: /` 헤더를 갖는지
- `/api/fit-log`가 인증 없이 접근될 때 401을 반환하는지
