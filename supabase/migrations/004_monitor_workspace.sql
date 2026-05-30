-- Monitor workspace: check state, timeline, detected changes, page snapshots

alter table public.monitors
  add column if not exists search_query text,
  add column if not exists plain_summary text,
  add column if not exists last_matched_count integer not null default 0,
  add column if not exists last_signal_count integer not null default 0,
  add column if not exists last_summary text,
  add column if not exists last_search_query text,
  add column if not exists last_match_title text,
  add column if not exists last_provider text;

create table if not exists public.monitor_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monitor_id uuid references public.monitors (id) on delete set null,
  event_type text not null check (
    event_type in (
      'change_detected',
      'check_complete',
      'report_generated',
      'workflow_triggered',
      'signal_matched'
    )
  ),
  summary text not null,
  severity text,
  monitor_requirement text,
  change_id uuid,
  report_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.monitor_detected_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monitor_id uuid references public.monitors (id) on delete set null,
  field text not null,
  old_value text not null,
  new_value text not null,
  source_url text not null,
  impact text not null,
  severity text not null,
  category text not null,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.monitor_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monitor_id uuid references public.monitors (id) on delete set null,
  url text not null,
  content_hash text not null,
  fields jsonb not null default '{}'::jsonb,
  raw_excerpt text,
  bright_data_mode text,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_monitor_timeline_user
  on public.monitor_timeline_events (user_id, created_at desc);

create index if not exists idx_monitor_timeline_monitor
  on public.monitor_timeline_events (monitor_id, created_at desc);

create index if not exists idx_monitor_changes_user
  on public.monitor_detected_changes (user_id, detected_at desc);

create index if not exists idx_monitor_changes_monitor
  on public.monitor_detected_changes (monitor_id, detected_at desc);

create index if not exists idx_monitor_snapshots_monitor
  on public.monitor_page_snapshots (monitor_id, url, collected_at desc);

alter table public.monitor_timeline_events enable row level security;
alter table public.monitor_detected_changes enable row level security;
alter table public.monitor_page_snapshots enable row level security;

drop policy if exists monitor_timeline_events_all on public.monitor_timeline_events;
create policy monitor_timeline_events_all on public.monitor_timeline_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists monitor_detected_changes_all on public.monitor_detected_changes;
create policy monitor_detected_changes_all on public.monitor_detected_changes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists monitor_page_snapshots_all on public.monitor_page_snapshots;
create policy monitor_page_snapshots_all on public.monitor_page_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
