# Smoke Test

## Account

1. Sign up with a new email.
2. Confirm the email link returns to `/auth/callback`.
3. Log in.
4. Open `/settings`.
5. Change password.
6. Trigger email change flow.

## Profile

1. Save a profile with:
   - display name
   - headline
   - bio
   - discoverable on
2. Upload an avatar.
3. Confirm the public profile page loads.

## Post

1. Create a draft post.
2. Add tags.
3. Upload a cover image.
4. Upload image/video media.
5. Publish it.
6. Confirm it appears on:
   - `/`
   - `/explore`
   - `/@username`

## Social

Using a second account:

1. Follow the first account.
2. Like the post.
3. Repost the post.
4. Add a comment.
5. Confirm notifications appear for the first account.

## Moderation

Using the second account:

1. Report the profile.
2. Report the post.

Using the admin account:

1. Open `/admin`.
2. Review the reports.
3. Hide the post.
4. Delete a comment.
5. Suspend and unsuspend a user.
6. Toggle discoverable.

## Ops

1. Open `/ops`.
2. Confirm all environment statuses are green.
3. Confirm page view and error counters are recording.

## SEO

1. Open `/robots.txt`.
2. Open `/sitemap.xml`.
3. Open `/opengraph-image`.
4. Share a page URL and confirm OGP renders.
