create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  google_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  scopes text[] not null default '{}',
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_email, google_email)
);

create table if not exists public.email_records (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  gmail_message_id text,
  thread_id text,
  source text not null default 'gmail',
  sender_name text,
  sender_email text not null,
  subject text not null,
  body_text text not null default '',
  category text not null,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  recommended_action text,
  review_state text check (review_state in ('safe','scam','opportunity') or review_state is null),
  reviewed_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_email, gmail_message_id)
);

create index if not exists email_records_user_received_idx on public.email_records(user_email, received_at desc nulls last, created_at desc);
create index if not exists email_records_user_category_idx on public.email_records(user_email, category);
create index if not exists email_records_user_sender_idx on public.email_records(user_email, lower(sender_email));

create table if not exists public.sender_rules (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  sender_email text not null,
  decision text not null check (decision in ('safe','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_email, sender_email)
);

create table if not exists public.user_preferences (
  user_email text primary key references public.app_users(email) on delete cascade,
  daily_alerts boolean not null default true,
  auto_sync boolean not null default false,
  notification_level text not null default 'critical',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_created_idx on public.activity_logs(user_email, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();
drop trigger if exists set_gmail_accounts_updated_at on public.gmail_accounts;
create trigger set_gmail_accounts_updated_at before update on public.gmail_accounts for each row execute function public.set_updated_at();
drop trigger if exists set_email_records_updated_at on public.email_records;
create trigger set_email_records_updated_at before update on public.email_records for each row execute function public.set_updated_at();
drop trigger if exists set_sender_rules_updated_at on public.sender_rules;
create trigger set_sender_rules_updated_at before update on public.sender_rules for each row execute function public.set_updated_at();
drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.gmail_accounts enable row level security;
alter table public.email_records enable row level security;
alter table public.sender_rules enable row level security;
alter table public.user_preferences enable row level security;
alter table public.activity_logs enable row level security;

revoke all on table public.gmail_accounts from anon, authenticated;
revoke all on table public.email_records from anon, authenticated;
revoke all on table public.sender_rules from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
revoke all on table public.activity_logs from anon, authenticated;
revoke all on table public.app_users from anon, authenticated;
