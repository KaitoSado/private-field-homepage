# New Commune

New Commune is a small social platform for public profiles, posts, and shared campus apps.

## Stack

- Next.js App Router
- Supabase Auth + Postgres + Storage
- Vercel deployment

## Features

- Email/password sign up and sign in
- Public profile page at `/@username`
- Public post page at `/@username/slug`
- Private dashboard for editing profile and posts
- Supabase Storage uploads for avatar images and post media
- Notifications for follows, likes, reposts, and comments
- User reporting and an admin moderation screen
- Opt-in discoverability for explore/recommendation surfaces
- Account settings for password and email changes
- Telemetry-backed monitoring, page view analytics, and abuse logs
- SEO files including OGP image, robots, sitemap, and favicon
- Changelog, retention policy, and ops status pages
- Static terms/privacy/contact pages
- Row Level Security policies for self-service editing
- Invite-only Research Progress dashboard for weekly research check-ins

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase project URL, anon key, service role key, and site URL
3. Run `npm install`
4. Run `npm run dev`
5. Apply [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor

The schema also creates public storage buckets for avatars and post media, plus object policies scoped to each authenticated user's folder.

## Deploy

1. Create a Supabase project
2. Run the SQL schema from [`supabase/schema.sql`](./supabase/schema.sql)
3. Add the variables from `.env.example` to Vercel
4. Deploy this repository to Vercel

## Production Runbook

- Status guide: [`docs/status.md`](./docs/status.md)
- Launch checklist: [`docs/launch-checklist.md`](./docs/launch-checklist.md)
- Smoke test: [`docs/smoke-test.md`](./docs/smoke-test.md)
- First admin SQL: [`supabase/first-admin.sql`](./supabase/first-admin.sql)

## Data model

- `profiles`: one row per authenticated user
- `posts`: multiple posts per user, public or draft
- `avatars` bucket: public profile images
- `post-media` bucket: public images and videos attached to posts
- `telemetry_page_views`, `telemetry_errors`, `abuse_events`, `admin_alerts`: operational logs
- `research_groups`, `research_group_members`, `research_updates`: invite-only weekly research progress tracking

## Notes

- Email delivery itself is handled by Supabase Auth. The ops page only verifies the surrounding application configuration.
- Storage public URLs are served through Supabase Storage's CDN-backed public asset flow.
