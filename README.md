# Mysun Fit Log

A mobile-first workout diary for Mysun, built with Next.js, Supabase, and Vercel.

## Features

- Supabase email and password signup/login
- Auth-gated first page
- Workout routine and set logging
- Weekly muscle balance scoring
- Supabase-only persistence for workout data
- Nike-inspired photography-first responsive UI

## Start

```bash
npm install
npm run dev
```

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run `supabase/migration-fit-log.sql` in the Supabase SQL editor before saving workouts.
