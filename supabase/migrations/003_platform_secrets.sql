-- Platform secrets vault (service-role only — no client access)
create table if not exists public.platform_env (
  key text primary key,
  value text not null,
  kind text not null default 'secret' check (kind in ('secret', 'config')),
  updated_at timestamptz not null default now()
);

alter table public.platform_env enable row level security;

revoke all on table public.platform_env from anon, authenticated;
revoke all on table public.platform_env from public;

create index if not exists idx_platform_env_kind on public.platform_env (kind);

comment on table public.platform_env is 'Server-only API keys and config. Read via SUPABASE_SECRET_KEY on deploy.';
