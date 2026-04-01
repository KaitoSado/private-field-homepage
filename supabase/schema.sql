create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  page_theme text not null default 'default',
  display_name text,
  headline text,
  affiliation text,
  focus_area text,
  open_to text,
  bio text,
  location text,
  website_url text,
  x_url text,
  github_url text,
  note_url text,
  avatar_url text,
  custom_links jsonb not null default '[]'::jsonb,
  email_domain text not null default '',
  email_verified boolean not null default false,
  keio_verified boolean not null default false,
  role text not null default 'user',
  account_status text not null default 'active',
  discoverable boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists page_theme text not null default 'default';
alter table public.profiles add column if not exists affiliation text;
alter table public.profiles add column if not exists focus_area text;
alter table public.profiles add column if not exists open_to text;
alter table public.profiles add column if not exists x_url text;
alter table public.profiles add column if not exists github_url text;
alter table public.profiles add column if not exists note_url text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists custom_links jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists email_domain text not null default '';
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists keio_verified boolean not null default false;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists discoverable boolean not null default true;
alter table public.profiles alter column discoverable set default true;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  body text,
  published boolean not null default false,
  visibility text not null default 'public',
  scheduled_for timestamptz,
  allow_comments boolean not null default true,
  tags text[] not null default '{}',
  media_items jsonb not null default '[]'::jsonb,
  cover_image_url text,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (author_id, slug)
);

alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts add column if not exists scheduled_for timestamptz;
alter table public.posts add column if not exists allow_comments boolean not null default true;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists media_items jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists cover_image_url text;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (follower_id, following_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (muter_id, muted_id)
);

create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, post_id)
);

create table if not exists public.post_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, post_id)
);

create table if not exists public.post_reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, post_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.anonymous_questions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  question text not null,
  answer text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.class_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  course_name text not null,
  course_scope text not null default '',
  instructor text not null default '',
  campus text not null default '',
  term_label text not null default '',
  weekday text not null default '',
  period_label text not null default '',
  easy_score smallint,
  s_score smallint,
  evaluation_type text not null default '',
  attendance_policy text not null default '',
  assignment_load smallint,
  quality_score smallint,
  verdict_grade text not null default '',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.special_articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  excerpt text not null default '',
  body text not null,
  price_label text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.edge_tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'その他',
  campus text not null default '',
  link_url text not null default '',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'その他',
  help_mode text not null default 'お願い',
  campus text not null default '',
  status text not null default '募集中',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.grad_ritual_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  room text not null default '呪詛ログ',
  vibe text not null default '吐き出したい',
  title text not null,
  timing_label text not null default '',
  body text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.anonymous_questions add column if not exists sender_profile_id uuid references public.profiles(id) on delete set null;
alter table public.class_notes add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.class_notes add column if not exists course_name text;
alter table public.class_notes add column if not exists course_scope text not null default '';
alter table public.class_notes add column if not exists instructor text not null default '';
alter table public.class_notes add column if not exists campus text not null default '';
alter table public.class_notes add column if not exists term_label text not null default '';
alter table public.class_notes add column if not exists weekday text not null default '';
alter table public.class_notes add column if not exists period_label text not null default '';
alter table public.class_notes add column if not exists easy_score smallint;
alter table public.class_notes add column if not exists s_score smallint;
alter table public.class_notes add column if not exists evaluation_type text not null default '';
alter table public.class_notes add column if not exists attendance_policy text not null default '';
alter table public.class_notes add column if not exists assignment_load smallint;
alter table public.class_notes add column if not exists quality_score smallint;
alter table public.class_notes add column if not exists verdict_grade text not null default '';
alter table public.class_notes add column if not exists body text;
alter table public.class_notes add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.class_notes add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.special_articles add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.special_articles add column if not exists title text;
alter table public.special_articles add column if not exists excerpt text not null default '';
alter table public.special_articles add column if not exists body text;
alter table public.special_articles add column if not exists price_label text not null default '';
alter table public.special_articles add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.special_articles add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.edge_tips add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.edge_tips add column if not exists title text;
alter table public.edge_tips add column if not exists category text not null default 'その他';
alter table public.edge_tips add column if not exists campus text not null default '';
alter table public.edge_tips add column if not exists link_url text not null default '';
alter table public.edge_tips add column if not exists body text;
alter table public.edge_tips add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.edge_tips add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.help_requests add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.help_requests add column if not exists title text;
alter table public.help_requests add column if not exists category text not null default 'その他';
alter table public.help_requests add column if not exists help_mode text not null default 'お願い';
alter table public.help_requests add column if not exists campus text not null default '';
alter table public.help_requests add column if not exists status text not null default '募集中';
alter table public.help_requests add column if not exists body text;
alter table public.help_requests add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.help_requests add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.grad_ritual_posts add column if not exists author_id uuid references public.profiles(id) on delete cascade;
alter table public.grad_ritual_posts add column if not exists room text not null default '呪詛ログ';
alter table public.grad_ritual_posts add column if not exists vibe text not null default '吐き出したい';
alter table public.grad_ritual_posts add column if not exists title text;
alter table public.grad_ritual_posts add column if not exists timing_label text not null default '';
alter table public.grad_ritual_posts add column if not exists body text;
alter table public.grad_ritual_posts add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.grad_ritual_posts add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  type text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  target_post_id uuid references public.posts(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint reports_target_check check (
    (target_profile_id is not null and target_post_id is null)
    or (target_profile_id is null and target_post_id is not null)
  )
);

create table if not exists public.telemetry_page_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.telemetry_errors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  level text not null default 'error',
  message text not null,
  pathname text,
  source text,
  stack text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.abuse_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_visibility_idx on public.posts(visibility, published_at desc);
create index if not exists posts_tags_gin_idx on public.posts using gin(tags);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists post_reposts_post_idx on public.post_reposts(post_id);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at desc);
create index if not exists anonymous_questions_recipient_idx on public.anonymous_questions(recipient_id, created_at desc);
create index if not exists anonymous_questions_sender_idx on public.anonymous_questions(sender_profile_id);
create index if not exists class_notes_updated_idx on public.class_notes(updated_at desc);
create index if not exists class_notes_author_idx on public.class_notes(author_id);
create index if not exists special_articles_updated_idx on public.special_articles(updated_at desc);
create index if not exists special_articles_author_idx on public.special_articles(author_id);
create index if not exists edge_tips_updated_idx on public.edge_tips(updated_at desc);
create index if not exists edge_tips_author_idx on public.edge_tips(author_id);
create index if not exists edge_tips_category_idx on public.edge_tips(category, updated_at desc);
create index if not exists help_requests_updated_idx on public.help_requests(updated_at desc);
create index if not exists help_requests_author_idx on public.help_requests(author_id);
create index if not exists help_requests_category_idx on public.help_requests(category, updated_at desc);
create index if not exists grad_ritual_posts_updated_idx on public.grad_ritual_posts(updated_at desc);
create index if not exists grad_ritual_posts_author_idx on public.grad_ritual_posts(author_id);
create index if not exists grad_ritual_posts_room_idx on public.grad_ritual_posts(room, updated_at desc);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists reports_target_profile_idx on public.reports(target_profile_id);
create index if not exists reports_target_post_idx on public.reports(target_post_id);
create index if not exists telemetry_page_views_created_idx on public.telemetry_page_views(created_at desc);
create index if not exists telemetry_errors_created_idx on public.telemetry_errors(created_at desc);
create index if not exists abuse_events_created_idx on public.abuse_events(created_at desc);
create index if not exists admin_alerts_created_idx on public.admin_alerts(created_at desc);
create unique index if not exists notifications_follow_unique
on public.notifications(recipient_id, actor_id, type)
where type = 'follow';
create unique index if not exists notifications_like_unique
on public.notifications(recipient_id, actor_id, post_id, type)
where type = 'like';
create unique index if not exists notifications_repost_unique
on public.notifications(recipient_id, actor_id, post_id, type)
where type = 'repost';

alter table public.profiles
  drop constraint if exists profiles_username_not_blank_check,
  add constraint profiles_username_not_blank_check check (char_length(btrim(username)) > 0),
  drop constraint if exists profiles_headline_length_check,
  add constraint profiles_headline_length_check check (headline is null or char_length(headline) <= 120),
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check check (bio is null or char_length(bio) <= 1000),
  drop constraint if exists profiles_open_to_length_check,
  add constraint profiles_open_to_length_check check (open_to is null or char_length(open_to) <= 280),
  drop constraint if exists profiles_location_length_check,
  add constraint profiles_location_length_check check (location is null or char_length(location) <= 80),
  drop constraint if exists profiles_email_domain_length_check,
  add constraint profiles_email_domain_length_check check (char_length(email_domain) <= 120);

alter table public.posts
  drop constraint if exists posts_title_length_check,
  add constraint posts_title_length_check check (char_length(title) <= 120),
  drop constraint if exists posts_excerpt_length_check,
  add constraint posts_excerpt_length_check check (excerpt is null or char_length(excerpt) <= 240),
  drop constraint if exists posts_body_length_check,
  add constraint posts_body_length_check check (body is null or char_length(body) <= 12000),
  drop constraint if exists posts_media_count_check,
  add constraint posts_media_count_check check (jsonb_array_length(media_items) <= 8),
  drop constraint if exists posts_visibility_value_check,
  add constraint posts_visibility_value_check check (visibility in ('public', 'unlisted', 'private'));

alter table public.post_comments
  drop constraint if exists post_comments_body_length_check,
  add constraint post_comments_body_length_check check (char_length(body) <= 500);

alter table public.anonymous_questions
  drop constraint if exists anonymous_questions_question_length_check,
  add constraint anonymous_questions_question_length_check check (char_length(question) <= 280),
  drop constraint if exists anonymous_questions_answer_length_check,
  add constraint anonymous_questions_answer_length_check check (answer is null or char_length(answer) <= 2000);

alter table public.class_notes
  drop constraint if exists class_notes_course_name_length_check,
  add constraint class_notes_course_name_length_check check (char_length(course_name) between 1 and 120),
  drop constraint if exists class_notes_course_scope_check,
  add constraint class_notes_course_scope_check check (course_scope in ('', '学部', '大学院', '共通')),
  drop constraint if exists class_notes_instructor_length_check,
  add constraint class_notes_instructor_length_check check (char_length(instructor) <= 120),
  drop constraint if exists class_notes_campus_length_check,
  add constraint class_notes_campus_length_check check (char_length(campus) <= 120),
  drop constraint if exists class_notes_term_label_length_check,
  add constraint class_notes_term_label_length_check check (char_length(term_label) <= 120),
  drop constraint if exists class_notes_weekday_length_check,
  add constraint class_notes_weekday_length_check check (char_length(weekday) <= 20),
  drop constraint if exists class_notes_period_label_length_check,
  add constraint class_notes_period_label_length_check check (char_length(period_label) <= 40),
  drop constraint if exists class_notes_easy_score_range_check,
  add constraint class_notes_easy_score_range_check check (easy_score is null or easy_score between 1 and 5),
  drop constraint if exists class_notes_s_score_range_check,
  add constraint class_notes_s_score_range_check check (s_score is null or s_score between 1 and 5),
  drop constraint if exists class_notes_assignment_load_range_check,
  add constraint class_notes_assignment_load_range_check check (assignment_load is null or assignment_load between 1 and 5),
  drop constraint if exists class_notes_quality_score_range_check,
  add constraint class_notes_quality_score_range_check check (quality_score is null or quality_score between 1 and 5),
  drop constraint if exists class_notes_evaluation_type_length_check,
  add constraint class_notes_evaluation_type_length_check check (char_length(evaluation_type) <= 40),
  drop constraint if exists class_notes_attendance_policy_length_check,
  add constraint class_notes_attendance_policy_length_check check (char_length(attendance_policy) <= 40),
  drop constraint if exists class_notes_verdict_grade_check,
  add constraint class_notes_verdict_grade_check check (verdict_grade in ('', 'S', 'A', 'B', 'C', 'D')),
  drop constraint if exists class_notes_body_length_check,
  add constraint class_notes_body_length_check check (char_length(body) between 1 and 2000);

alter table public.special_articles
  drop constraint if exists special_articles_title_length_check,
  add constraint special_articles_title_length_check check (char_length(title) between 1 and 140),
  drop constraint if exists special_articles_excerpt_length_check,
  add constraint special_articles_excerpt_length_check check (char_length(excerpt) <= 240),
  drop constraint if exists special_articles_price_label_length_check,
  add constraint special_articles_price_label_length_check check (char_length(price_label) <= 40),
  drop constraint if exists special_articles_body_length_check,
  add constraint special_articles_body_length_check check (char_length(body) between 1 and 12000);

alter table public.edge_tips
  drop constraint if exists edge_tips_title_length_check,
  add constraint edge_tips_title_length_check check (char_length(title) between 1 and 120),
  drop constraint if exists edge_tips_category_check,
  add constraint edge_tips_category_check check (category in ('学割', '無料', '助成', '食費', '交通', 'ソフト', '住まい', '学内', 'バイト', 'その他')),
  drop constraint if exists edge_tips_campus_length_check,
  add constraint edge_tips_campus_length_check check (char_length(campus) <= 80),
  drop constraint if exists edge_tips_link_url_length_check,
  add constraint edge_tips_link_url_length_check check (char_length(link_url) <= 500),
  drop constraint if exists edge_tips_body_length_check,
  add constraint edge_tips_body_length_check check (char_length(body) between 1 and 2000);

alter table public.help_requests
  drop constraint if exists help_requests_title_length_check,
  add constraint help_requests_title_length_check check (char_length(title) between 1 and 120),
  drop constraint if exists help_requests_category_check,
  add constraint help_requests_category_check check (category in ('ノート共有', '過去問交換', '空きコマ同行', '機材貸し借り', '引っ越し手伝い', 'その他')),
  drop constraint if exists help_requests_help_mode_check,
  add constraint help_requests_help_mode_check check (help_mode in ('お願い', '提供')),
  drop constraint if exists help_requests_status_check,
  add constraint help_requests_status_check check (status in ('募集中', '成立', '停止中')),
  drop constraint if exists help_requests_campus_length_check,
  add constraint help_requests_campus_length_check check (char_length(campus) <= 80),
  drop constraint if exists help_requests_body_length_check,
  add constraint help_requests_body_length_check check (char_length(body) between 1 and 2000);

alter table public.grad_ritual_posts
  drop constraint if exists grad_ritual_posts_title_length_check,
  add constraint grad_ritual_posts_title_length_check check (char_length(title) between 1 and 120),
  drop constraint if exists grad_ritual_posts_room_check,
  add constraint grad_ritual_posts_room_check check (room in ('呪詛ログ', '祈祷室', '院生ロビー', '一緒に見る', '生存確認')),
  drop constraint if exists grad_ritual_posts_vibe_check,
  add constraint grad_ritual_posts_vibe_check check (vibe in ('吐き出したい', '祈ってほしい', '雑談したい', '募集したい', '生存報告')),
  drop constraint if exists grad_ritual_posts_timing_label_length_check,
  add constraint grad_ritual_posts_timing_label_length_check check (char_length(timing_label) <= 80),
  drop constraint if exists grad_ritual_posts_body_length_check,
  add constraint grad_ritual_posts_body_length_check check (char_length(body) between 1 and 2000);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = excluded.public;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  normalized_domain text;
  is_email_verified boolean;
begin
  normalized_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  is_email_verified := new.email_confirmed_at is not null;
  base_username :=
    coalesce(
      nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_-]+', '-', 'g'), ''),
      'user'
    );

  insert into public.profiles (id, username, email_domain, email_verified, keio_verified)
  values (
    new.id,
    left(base_username || '-' || substring(new.id::text from 1 for 6), 30),
    normalized_domain,
    is_email_verified,
    normalized_domain in ('keio.jp', 'keio.ac.jp') and is_email_verified
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_domain text;
  is_email_verified boolean;
begin
  normalized_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  is_email_verified := new.email_confirmed_at is not null;

  update public.profiles
  set
    email_domain = normalized_domain,
    email_verified = is_email_verified,
    keio_verified = normalized_domain in ('keio.jp', 'keio.ac.jp') and is_email_verified
  where id = new.id;

  return new;
end;
$$;

update public.profiles as p
set
  username = left(
    coalesce(
      nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_-]+', '-', 'g'), ''),
      'user'
    ) || '-' || substring(p.id::text from 1 for 6),
    30
  ),
  email_domain = lower(split_part(u.email, '@', 2)),
  email_verified = u.email_confirmed_at is not null,
  keio_verified = lower(split_part(u.email, '@', 2)) in ('keio.jp', 'keio.ac.jp') and u.email_confirmed_at is not null
from auth.users as u
where u.id = p.id
  and (
    nullif(btrim(p.username), '') is null
    or p.email_domain = ''
    or p.email_verified is distinct from (u.email_confirmed_at is not null)
    or p.keio_verified is distinct from ((lower(split_part(u.email, '@', 2)) in ('keio.jp', 'keio.ac.jp')) and u.email_confirmed_at is not null)
  );

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute procedure public.handle_auth_user_updated();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute procedure public.handle_updated_at();

drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at
before update on public.post_comments
for each row execute procedure public.handle_updated_at();

drop trigger if exists anonymous_questions_set_updated_at on public.anonymous_questions;
create trigger anonymous_questions_set_updated_at
before update on public.anonymous_questions
for each row execute procedure public.handle_updated_at();

drop trigger if exists class_notes_set_updated_at on public.class_notes;
create trigger class_notes_set_updated_at
before update on public.class_notes
for each row execute procedure public.handle_updated_at();

drop trigger if exists special_articles_set_updated_at on public.special_articles;
create trigger special_articles_set_updated_at
before update on public.special_articles
for each row execute procedure public.handle_updated_at();

drop trigger if exists edge_tips_set_updated_at on public.edge_tips;
create trigger edge_tips_set_updated_at
before update on public.edge_tips
for each row execute procedure public.handle_updated_at();

drop trigger if exists help_requests_set_updated_at on public.help_requests;
create trigger help_requests_set_updated_at
before update on public.help_requests
for each row execute procedure public.handle_updated_at();

drop trigger if exists grad_ritual_posts_set_updated_at on public.grad_ritual_posts;
create trigger grad_ritual_posts_set_updated_at
before update on public.grad_ritual_posts
for each row execute procedure public.handle_updated_at();

create or replace view public.profile_stats as
select
  p.id as profile_id,
  count(distinct follower_rows.follower_id) as follower_count,
  count(distinct following_rows.following_id) as following_count,
  count(
    distinct case
      when post_rows.published = true
        and coalesce(post_rows.visibility, 'public') = 'public'
        and (post_rows.scheduled_for is null or post_rows.scheduled_for <= timezone('utc'::text, now()))
      then post_rows.id
      else null
    end
  ) as public_post_count
from public.profiles p
left join public.follows follower_rows on follower_rows.following_id = p.id
left join public.follows following_rows on following_rows.follower_id = p.id
left join public.posts post_rows on post_rows.author_id = p.id
group by p.id;

create or replace view public.post_stats as
select
  p.id as post_id,
  count(distinct like_rows.user_id) as like_count,
  count(distinct repost_rows.user_id) as repost_count,
  count(distinct comment_rows.id) as comment_count
from public.posts p
left join public.post_likes like_rows on like_rows.post_id = p.id
left join public.post_reposts repost_rows on repost_rows.post_id = p.id
left join public.post_comments comment_rows on comment_rows.post_id = p.id
group by p.id;

create or replace view public.tag_stats as
select
  lower(trim(tag_value)) as tag,
  count(*) as use_count
from public.posts p,
unnest(coalesce(p.tags, '{}')) as tag_value
where p.published = true
  and coalesce(p.visibility, 'public') = 'public'
  and (p.scheduled_for is null or p.scheduled_for <= timezone('utc'::text, now()))
  and trim(tag_value) <> ''
group by lower(trim(tag_value));

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_reposts enable row level security;
alter table public.post_comments enable row level security;
alter table public.anonymous_questions enable row level security;
alter table public.class_notes enable row level security;
alter table public.special_articles enable row level security;
alter table public.edge_tips enable row level security;
alter table public.help_requests enable row level security;
alter table public.grad_ritual_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.telemetry_page_views enable row level security;
alter table public.telemetry_errors enable row level security;
alter table public.abuse_events enable row level security;
alter table public.admin_alerts enable row level security;

drop policy if exists "profiles are public readable" on public.profiles;
create policy "profiles are public readable"
on public.profiles
for select
using (account_status = 'active' or auth.uid() = id or public.is_admin());

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admins can update profiles" on public.profiles;
create policy "admins can update profiles"
on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "published posts are public readable" on public.posts;
create policy "published posts are public readable"
on public.posts
for select
using (
  (
    published = true
    and coalesce(visibility, 'public') in ('public', 'unlisted')
    and (scheduled_for is null or scheduled_for <= timezone('utc'::text, now()))
    and exists (
      select 1 from public.profiles
      where profiles.id = posts.author_id
        and profiles.account_status = 'active'
    )
  )
  or auth.uid() = author_id
  or public.is_admin()
);

drop policy if exists "users can insert own posts" on public.posts;
create policy "users can insert own posts"
on public.posts
for insert
with check (auth.uid() = author_id);

drop policy if exists "users can update own posts" on public.posts;
create policy "users can update own posts"
on public.posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "users can delete own posts" on public.posts;
create policy "users can delete own posts"
on public.posts
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can update posts" on public.posts;
create policy "admins can update posts"
on public.posts
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts"
on public.posts
for delete
using (public.is_admin());

drop policy if exists "follows are public readable" on public.follows;
create policy "follows are public readable"
on public.follows
for select
using (true);

drop policy if exists "users can follow" on public.follows;
create policy "users can follow"
on public.follows
for insert
with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow"
on public.follows
for delete
using (auth.uid() = follower_id);

drop policy if exists "likes are public readable" on public.post_likes;
create policy "likes are public readable"
on public.post_likes
for select
using (true);

drop policy if exists "users can like posts" on public.post_likes;
create policy "users can like posts"
on public.post_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can unlike posts" on public.post_likes;
create policy "users can unlike posts"
on public.post_likes
for delete
using (auth.uid() = user_id);

drop policy if exists "reposts are public readable" on public.post_reposts;
create policy "reposts are public readable"
on public.post_reposts
for select
using (true);

drop policy if exists "users can repost posts" on public.post_reposts;
create policy "users can repost posts"
on public.post_reposts
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can undo reposts" on public.post_reposts;
create policy "users can undo reposts"
on public.post_reposts
for delete
using (auth.uid() = user_id);

drop policy if exists "bookmarks are private" on public.post_bookmarks;
create policy "bookmarks are private"
on public.post_bookmarks
for select
using (auth.uid() = user_id);

drop policy if exists "users can bookmark posts" on public.post_bookmarks;
create policy "users can bookmark posts"
on public.post_bookmarks
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can remove bookmarks" on public.post_bookmarks;
create policy "users can remove bookmarks"
on public.post_bookmarks
for delete
using (auth.uid() = user_id);

drop policy if exists "public comments are readable" on public.post_comments;
create policy "public comments are readable"
on public.post_comments
for select
using (true);

drop policy if exists "users can comment on posts" on public.post_comments;
create policy "users can comment on posts"
on public.post_comments
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.posts
    where posts.id = post_comments.post_id
      and (posts.allow_comments = true or posts.author_id = auth.uid())
      and (
        (
          posts.published = true
          and coalesce(posts.visibility, 'public') in ('public', 'unlisted')
          and (posts.scheduled_for is null or posts.scheduled_for <= timezone('utc'::text, now()))
        )
        or posts.author_id = auth.uid()
      )
  )
);

drop policy if exists "users can update own comments" on public.post_comments;
create policy "users can update own comments"
on public.post_comments
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own comments" on public.post_comments;
create policy "users can delete own comments"
on public.post_comments
for delete
using (auth.uid() = user_id);

drop policy if exists "answered anonymous questions are public readable" on public.anonymous_questions;
create policy "answered anonymous questions are public readable"
on public.anonymous_questions
for select
using (answer is not null or auth.uid() = recipient_id or public.is_admin());

drop policy if exists "anyone can submit anonymous questions" on public.anonymous_questions;
create policy "anyone can submit anonymous questions"
on public.anonymous_questions
for insert
to anon, authenticated
with check (
  char_length(btrim(question)) > 0
  and (
    (auth.uid() is null and sender_profile_id is null)
    or (auth.uid() is not null and sender_profile_id = auth.uid())
  )
  and exists (
    select 1
    from public.profiles
    where profiles.id = anonymous_questions.recipient_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update anonymous questions" on public.anonymous_questions;
create policy "owners can update anonymous questions"
on public.anonymous_questions
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "owners can delete anonymous questions" on public.anonymous_questions;
create policy "owners can delete anonymous questions"
on public.anonymous_questions
for delete
using (auth.uid() = recipient_id);

drop policy if exists "admins can manage anonymous questions" on public.anonymous_questions;
create policy "admins can manage anonymous questions"
on public.anonymous_questions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "class notes are public readable" on public.class_notes;
create policy "class notes are public readable"
on public.class_notes
for select
using (true);

drop policy if exists "authenticated users can create class notes" on public.class_notes;
create policy "authenticated users can create class notes"
on public.class_notes
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = class_notes.author_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update class notes" on public.class_notes;
create policy "owners can update class notes"
on public.class_notes
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "owners can delete class notes" on public.class_notes;
create policy "owners can delete class notes"
on public.class_notes
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can manage class notes" on public.class_notes;
create policy "admins can manage class notes"
on public.class_notes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "edge tips are public readable" on public.edge_tips;
create policy "edge tips are public readable"
on public.edge_tips
for select
using (true);

drop policy if exists "authenticated users can create edge tips" on public.edge_tips;
create policy "authenticated users can create edge tips"
on public.edge_tips
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = edge_tips.author_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update edge tips" on public.edge_tips;
create policy "owners can update edge tips"
on public.edge_tips
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "owners can delete edge tips" on public.edge_tips;
create policy "owners can delete edge tips"
on public.edge_tips
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can manage edge tips" on public.edge_tips;
create policy "admins can manage edge tips"
on public.edge_tips
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "help requests are public readable" on public.help_requests;
create policy "help requests are public readable"
on public.help_requests
for select
using (true);

drop policy if exists "authenticated users can create help requests" on public.help_requests;
create policy "authenticated users can create help requests"
on public.help_requests
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = help_requests.author_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update help requests" on public.help_requests;
create policy "owners can update help requests"
on public.help_requests
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "owners can delete help requests" on public.help_requests;
create policy "owners can delete help requests"
on public.help_requests
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can manage help requests" on public.help_requests;
create policy "admins can manage help requests"
on public.help_requests
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "ritual posts are public readable" on public.grad_ritual_posts;
create policy "ritual posts are public readable"
on public.grad_ritual_posts
for select
using (true);

drop policy if exists "authenticated users can create ritual posts" on public.grad_ritual_posts;
create policy "authenticated users can create ritual posts"
on public.grad_ritual_posts
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = grad_ritual_posts.author_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update ritual posts" on public.grad_ritual_posts;
create policy "owners can update ritual posts"
on public.grad_ritual_posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "owners can delete ritual posts" on public.grad_ritual_posts;
create policy "owners can delete ritual posts"
on public.grad_ritual_posts
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can manage ritual posts" on public.grad_ritual_posts;
create policy "admins can manage ritual posts"
on public.grad_ritual_posts
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "special articles are public readable" on public.special_articles;
create policy "special articles are public readable"
on public.special_articles
for select
using (true);

drop policy if exists "authenticated users can create special articles" on public.special_articles;
create policy "authenticated users can create special articles"
on public.special_articles
for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = special_articles.author_id
      and profiles.account_status = 'active'
  )
);

drop policy if exists "owners can update special articles" on public.special_articles;
create policy "owners can update special articles"
on public.special_articles
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "owners can delete special articles" on public.special_articles;
create policy "owners can delete special articles"
on public.special_articles
for delete
using (auth.uid() = author_id);

drop policy if exists "admins can manage special articles" on public.special_articles;
create policy "admins can manage special articles"
on public.special_articles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete comments" on public.post_comments;
create policy "admins can delete comments"
on public.post_comments
for delete
using (public.is_admin());

drop policy if exists "blocks are private" on public.blocks;
create policy "blocks are private"
on public.blocks
for select
using (auth.uid() = blocker_id);

drop policy if exists "users can block" on public.blocks;
create policy "users can block"
on public.blocks
for insert
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

drop policy if exists "users can unblock" on public.blocks;
create policy "users can unblock"
on public.blocks
for delete
using (auth.uid() = blocker_id);

drop policy if exists "mutes are private" on public.mutes;
create policy "mutes are private"
on public.mutes
for select
using (auth.uid() = muter_id);

drop policy if exists "users can mute" on public.mutes;
create policy "users can mute"
on public.mutes
for insert
with check (auth.uid() = muter_id and muter_id <> muted_id);

drop policy if exists "users can unmute" on public.mutes;
create policy "users can unmute"
on public.mutes
for delete
using (auth.uid() = muter_id);

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications
for select
using (auth.uid() = recipient_id);

drop policy if exists "actors can insert notifications" on public.notifications;
create policy "actors can insert notifications"
on public.notifications
for insert
with check (auth.uid() = actor_id and actor_id <> recipient_id);

drop policy if exists "recipients can update notifications" on public.notifications;
create policy "recipients can update notifications"
on public.notifications
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "actors or recipients can delete notifications" on public.notifications;
create policy "actors or recipients can delete notifications"
on public.notifications
for delete
using (auth.uid() = actor_id or auth.uid() = recipient_id);

drop policy if exists "users can create reports" on public.reports;
create policy "users can create reports"
on public.reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists "reporters can read own reports" on public.reports;
create policy "reporters can read own reports"
on public.reports
for select
using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "admins can update reports" on public.reports;
create policy "admins can update reports"
on public.reports
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete reports" on public.reports;
create policy "admins can delete reports"
on public.reports
for delete
using (public.is_admin());

drop policy if exists "admins can read telemetry page views" on public.telemetry_page_views;
create policy "admins can read telemetry page views"
on public.telemetry_page_views
for select
using (public.is_admin());

drop policy if exists "admins can read telemetry errors" on public.telemetry_errors;
create policy "admins can read telemetry errors"
on public.telemetry_errors
for select
using (public.is_admin());

drop policy if exists "admins can read abuse events" on public.abuse_events;
create policy "admins can read abuse events"
on public.abuse_events
for select
using (public.is_admin());

drop policy if exists "admins can read alerts" on public.admin_alerts;
create policy "admins can read alerts"
on public.admin_alerts
for select
using (public.is_admin());

drop policy if exists "admins can update alerts" on public.admin_alerts;
create policy "admins can update alerts"
on public.admin_alerts
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete alerts" on public.admin_alerts;
create policy "admins can delete alerts"
on public.admin_alerts
for delete
using (public.is_admin());

drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatars" on storage.objects;
create policy "users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users can update own avatars" on storage.objects;
create policy "users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users can delete own avatars" on storage.objects;
create policy "users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "post media is public" on storage.objects;
create policy "post media is public"
on storage.objects
for select
using (bucket_id = 'post-media');

drop policy if exists "users can upload own post media" on storage.objects;
create policy "users can upload own post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users can update own post media" on storage.objects;
create policy "users can update own post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users can delete own post media" on storage.objects;
create policy "users can delete own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
