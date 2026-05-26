-- Sentra AI initial schema

create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  company_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  provider text,
  created_at timestamptz not null default now()
);

-- Intelligence
create table public.intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  provider text not null check (provider in ('bright-data', 'demo')),
  evidence_preview text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.intelligence_runs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source text not null,
  summary text not null,
  category text not null,
  severity text not null,
  confidence double precision not null default 0.8,
  signal_timestamp text not null default 'just now',
  created_at timestamptz not null default now()
);

-- Monitors
create table public.monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requirement text not null,
  category text not null default 'any',
  minimum_severity text not null default 'medium',
  keywords text[] not null default '{}',
  target_url text,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monitor_events (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors (id) on delete cascade,
  signal_id uuid not null references public.signals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now(),
  unique (monitor_id, signal_id)
);

-- Bright Data cache
create table public.bd_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- API rate limits
create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  unique (user_id, action, window_start)
);

create index idx_chat_threads_user on public.chat_threads (user_id, updated_at desc);
create index idx_chat_messages_thread on public.chat_messages (thread_id, created_at);
create index idx_intelligence_runs_user on public.intelligence_runs (user_id, created_at desc);
create index idx_signals_user on public.signals (user_id, created_at desc);
create index idx_signals_run on public.signals (run_id);
create index idx_monitors_user on public.monitors (user_id);
create index idx_monitor_events_user on public.monitor_events (user_id, seen_at desc);
create index idx_bd_cache_expires on public.bd_cache (expires_at);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.intelligence_runs enable row level security;
alter table public.signals enable row level security;
alter table public.monitors enable row level security;
alter table public.monitor_events enable row level security;
alter table public.bd_cache enable row level security;
alter table public.api_usage enable row level security;

create policy profiles_select on public.profiles for select using (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

create policy chat_threads_all on public.chat_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy chat_messages_all on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy intelligence_runs_all on public.intelligence_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy signals_all on public.signals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy monitors_all on public.monitors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy monitor_events_all on public.monitor_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- bd_cache: service role only (no user policies)
create policy api_usage_all on public.api_usage for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
