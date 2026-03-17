# Launch Checklist

## 1. Supabase

1. Create a production Supabase project.
2. Apply [`supabase/schema.sql`](../supabase/schema.sql) in the SQL editor.
3. Create the first admin user by signing up once, then run [`supabase/first-admin.sql`](../supabase/first-admin.sql) with that user's UUID.
4. Confirm these buckets exist and are public:
   - `avatars`
   - `post-media`
5. In Auth settings:
   - Enable email/password
   - Set the site URL to your production domain
   - Add redirect URLs:
     - `https://YOUR_DOMAIN/auth/callback`
     - `https://YOUR_DOMAIN/auth/reset`

## 2. Environment Variables

Set these in Vercel production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET`
- `NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Recommended values:

- `NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET=avatars`
- `NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET=post-media`

## 3. Vercel

1. Import the repository into Vercel.
2. Set the production branch.
3. Add all environment variables.
4. Deploy.
5. Open:
   - `/`
   - `/auth`
   - `/settings`
   - `/notifications`
   - `/admin`
   - `/ops`

## 4. Smoke Test

Run the full checklist in [`docs/smoke-test.md`](./smoke-test.md).

## 5. Public Launch Gate

Do not open the service publicly until all of these are true:

- Admin account works
- Email verification works
- Password reset works
- Avatar upload works
- Post image/video upload works
- Comment, follow, like, repost notifications work
- Reports appear in `/admin`
- User suspension hides public visibility
- `discoverable` controls feed/explore visibility
- `/robots.txt`, `/sitemap.xml`, and OGP load correctly
- `/ops` shows all required config as set

## 6. First Week Monitoring

Check daily:

- `/ops`
- `/admin`
- unread `admin_alerts`
- spike in `abuse_events`
- spike in `telemetry_errors`
- support inbox
