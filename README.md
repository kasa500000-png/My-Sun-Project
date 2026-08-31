# 마이썬 운동일지

모바일 사용을 우선으로 만든 개인 운동·식단 기록 웹앱입니다.

## 기능

- 이메일과 비밀번호 기반 회원가입/로그인
- 로그인 후 운동 일지 진입
- 루틴, 세트, 무게, 횟수, 시간 기록
- 주간 근육 밸런스 분석
- 식단·영양 목표 기록과 AI 식단 사진 분석
- Supabase 기반 사용자별 클라우드 저장
- 모바일 웹뷰 중심의 한국어 UI와 PWA

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
FIT_DIET_IMAGE_BUCKET=fit-diet-images
FIT_AI_DAILY_LIMIT=20
FIT_AI_MINUTE_LIMIT=3
XAI_API_KEY=
XAI_MODEL=grok-4.3
XAI_VISION_MODEL=grok-4
```

## Supabase 마이그레이션

운동·식단 기본 테이블과 AI 호출 제한·비공개 식단 이미지 Storage 구성을 순서대로 적용합니다.

```bash
npm run db:migrate
```

`db:migrate`는 다음 SQL을 순서대로 실행합니다.

1. `supabase/migration-fit-log.sql`
2. `supabase/migration-ai-storage-security.sql`

SQL Editor에서 수동 실행하는 경우에도 같은 순서를 사용합니다. 두 번째 마이그레이션은 다음을 추가합니다.

- `fit_diet_meal_logs.image_path`
- 비공개 `fit-diet-images` Storage 버킷
- 사용자별 AI 분석 분당·일일 사용량 버킷
- 동시 요청을 직렬화하는 `consume_fit_ai_analysis_quota` RPC

`SUPABASE_DB_URL`은 Supabase Postgres 직접 연결 문자열입니다. Vercel 클라이언트 환경변수나 `NEXT_PUBLIC_` 값으로 노출하지 말고 로컬 또는 서버 환경변수로만 설정합니다.

## 기존 Base64 식단 이미지 이전

기존 `image_url` 컬럼에 `data:image/...` 형태로 저장된 사진은 먼저 스테이징에서 dry run을 확인합니다.

```bash
npm run migrate:diet-images
npm run migrate:diet-images -- --execute
```

`--execute` 실행 전 DB 백업과 대상 Supabase 프로젝트 URL을 반드시 확인합니다. 새로 저장되는 사진은 DB에 Base64를 넣지 않고 비공개 Storage 경로만 저장하며, API가 짧은 만료시간의 signed URL을 반환합니다.

## 스테이징 CRUD 검증

별도 Supabase 스테이징 프로젝트에 두 마이그레이션을 적용한 뒤 다음 환경변수로 격리된 CRUD smoke test를 실행합니다.

```env
SUPABASE_STAGING_URL=
SUPABASE_STAGING_ANON_KEY=
SUPABASE_STAGING_SERVICE_ROLE_KEY=
```

```bash
npm run smoke:staging
```

테스트는 임시 사용자 2명을 생성해 인증·RLS 격리, 운동 기록, 설정, 식단, 영양 목표, 비공개 Storage, signed URL, AI quota RPC, 수정·삭제와 정리를 검증합니다. GitHub Actions의 `Supabase staging CRUD smoke` 워푬플로도 `staging` Environment secrets를 사용해 수동 실행할 수 있습니다.

## AI 분석 보호

`/api/diet/analyze`는 다음 조건을 모두 통과해야 xAI를 호출합니다.

- 유효한 Supabase 로그인 세션
- 동일 Origin의 JSON 요청
- 요청·이미지 크기 제한
- DB 기반 사용자별 분당·일일 사용량 제한
- 서버 전용 `XAI_API_KEY`

기본 제한은 사용자당 분당 3회, KST 기준 일일 20회이며 서버 환경변수로 조정할 수 있습니다.

## 검증

배포 전에는 아래 명령을 기준으로 확인합니다.

```bash
npm run validate
```

검증에는 TypeScript, ESLint, Node 계약 테스트, PWA·보안·근육 카드 자산 품질 검사와 Next.js production build가 포함됩니다.

## 배포

GitHub `main` 브랜치에 푸시하면 Vercel 프로덕션 배포가 실행됩니다.

배포 후 확인할 항목:

- `/login` 페이지가 정상 렌더링되는지
- `/manifest.webmanifest`가 `application/manifest+json`으로 응답하는지
- `/sw.js`가 `no-store`와 `Service-Worker-Allowed: /` 헤더를 갖는지
- `/api/fit-log`가 인증 없이 접근될 때 401을 반환하는지
- `/api/diet/analyze`가 인증 없이 접근될 때 401을 반환하는지
- 식단 사진 저장 후 DB에는 `image_path`만 기록되고 signed URL로 표시되는지
- AI 요청 제한 초과 시 429와 `Retry-After`가 반환되는지
