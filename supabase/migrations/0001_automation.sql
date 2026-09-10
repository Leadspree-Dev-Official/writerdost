-- Writerdost AI — content automation schema.
--
-- Apply with:  supabase db push        (or paste into the SQL editor)
--
-- Everything here is scoped to auth.uid() through row level security, so the
-- browser can talk to Supabase directly with the anon key while the cron
-- worker uses the service-role key to act across users.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Destinations: where finished posts get sent.
-- ---------------------------------------------------------------------------
create type destination_kind as enum (
  'wordpress', 'ghost', 'webflow', 'strapi', 'sanity', 'webhook'
);

create table if not exists destinations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  kind          destination_kind not null,
  -- Non-secret settings: site URL, collection id, default category, etc.
  config        jsonb not null default '{}'::jsonb,
  -- Credentials, AES-256-GCM encrypted by the server. Never the raw token.
  secret_cipher text,
  last_ok_at    timestamptz,
  last_error    text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Automations: one scheduled content job.
-- ---------------------------------------------------------------------------
create type automation_source as enum ('topic', 'rss', 'sitemap', 'url');
create type publish_mode      as enum ('draft', 'publish', 'gated');

create table if not exists automations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  enabled        boolean not null default true,

  source_kind    automation_source not null,
  -- topic: { topics: [...], rotate: true }
  -- rss/sitemap/url: { feedUrl, maxPerRun, minWords }
  source_config  jsonb not null default '{}'::jsonb,

  -- Voice and shape of the output: tone, audience, targetWords, keywords,
  -- language, and whether to cite the source.
  content_config jsonb not null default '{}'::jsonb,

  -- Which AI provider/model to spend on. The key itself is encrypted.
  ai_config      jsonb not null default '{}'::jsonb,
  ai_secret_cipher text,

  destination_id uuid references destinations(id) on delete set null,
  publish        publish_mode not null default 'draft',

  -- Standard 5-field cron, evaluated in the automation's timezone.
  schedule_cron  text not null default '0 9 * * *',
  timezone       text not null default 'UTC',

  last_run_at    timestamptz,
  next_run_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists automations_due_idx
  on automations (next_run_at) where enabled;

-- ---------------------------------------------------------------------------
-- Runs: one execution, successful or not. This is the audit trail.
-- ---------------------------------------------------------------------------
create type run_status as enum ('running', 'success', 'skipped', 'error');

create table if not exists automation_runs (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        run_status not null default 'running',
  trigger       text not null default 'schedule',   -- schedule | manual
  detail        text,
  tokens_used   integer not null default 0,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index if not exists runs_by_automation_idx
  on automation_runs (automation_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Generated posts.
-- ---------------------------------------------------------------------------
create type post_state as enum ('draft', 'published', 'failed');

create table if not exists generated_posts (
  id             uuid primary key default gen_random_uuid(),
  automation_id  uuid references automations(id) on delete set null,
  run_id         uuid references automation_runs(id) on delete set null,
  user_id        uuid not null references auth.users(id) on delete cascade,

  title          text not null,
  slug           text,
  body_html      text not null default '',
  body_markdown  text not null default '',
  excerpt        text,
  meta_description text,
  keywords       text[] not null default '{}',

  source_url     text,
  source_title   text,

  state          post_state not null default 'draft',
  remote_id      text,
  remote_url     text,
  quality        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists posts_by_user_idx
  on generated_posts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Dedupe: never rewrite the same source article twice.
-- ---------------------------------------------------------------------------
create table if not exists seen_sources (
  automation_id uuid not null references automations(id) on delete cascade,
  url_hash      text not null,
  url           text not null,
  seen_at       timestamptz not null default now(),
  primary key (automation_id, url_hash)
);

-- ---------------------------------------------------------------------------
-- Row level security. Each user sees only their own rows; the service-role
-- key used by the cron worker bypasses RLS by design.
-- ---------------------------------------------------------------------------
alter table destinations     enable row level security;
alter table automations      enable row level security;
alter table automation_runs  enable row level security;
alter table generated_posts  enable row level security;
alter table seen_sources     enable row level security;

create policy "own destinations" on destinations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own automations" on automations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own runs" on automation_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own posts" on generated_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own seen sources" on seen_sources
  for all using (
    exists (select 1 from automations a
            where a.id = seen_sources.automation_id and a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Scheduling. pg_cron wakes every five minutes and pokes the app, which then
-- decides which automations are actually due. Keeping the decision in the app
-- means one schedule to operate instead of one cron entry per automation.
--
-- Set these once per project (values are not stored in this file):
--   select vault.create_secret('https://your-app.example.com', 'app_url');
--   select vault.create_secret('<WRITERDOST_CRON_SECRET>', 'cron_secret');
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'writerdost-automation-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url')
               || '/api/automations/tick',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret',
                 (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
