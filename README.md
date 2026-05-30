# Mysun Fit Log

여자친구를 위한 모바일 우선 운동 일지 웹앱입니다.

## 기능

- 운동 루틴 선택
- 세트, 무게, 횟수, 시간 기록
- 오늘 사용한 근육 자동 분석
- 주간 근육 밸런스
- Supabase 로그인/저장
- 로그인 전 localStorage 저장

## 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase Dashboard에서 `supabase/migration-fit-log.sql`을 실행한 뒤 `.env.local`에 값을 넣어주세요.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
