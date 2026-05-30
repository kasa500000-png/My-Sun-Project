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
```

운동 기록을 저장하기 전에 Supabase SQL Editor에서 `supabase/migration-fit-log.sql`을 실행합니다.
