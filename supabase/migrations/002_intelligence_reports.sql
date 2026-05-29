create table if not exists public.intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monitor_id uuid references public.monitors (id) on delete set null,
  title text not null,
  risk_score integer not null default 0,
  confidence integer not null default 0,
  hallucination_risk text not null default 'medium',
  provider text not null check (provider in ('bright-data', 'demo')),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.intelligence_reports enable row level security;

create index if not exists idx_intelligence_reports_user
  on public.intelligence_reports (user_id, created_at desc);

create index if not exists idx_intelligence_reports_monitor
  on public.intelligence_reports (monitor_id, created_at desc);

drop policy if exists intelligence_reports_all on public.intelligence_reports;
create policy intelligence_reports_all on public.intelligence_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
