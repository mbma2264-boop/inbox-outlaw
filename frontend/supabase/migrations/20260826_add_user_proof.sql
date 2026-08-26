create table if not exists public.user_proof (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  email_record_id uuid references public.email_records(id) on delete set null,
  sender_email text not null,
  sender_domain text not null,
  proof_type text not null check (proof_type in ('payout','purchase','receipt','account','identity','relationship','other')),
  proof_summary text not null,
  amount numeric(14,2),
  currency text,
  transaction_reference text,
  proof_url text,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_proof_user_sender_idx on public.user_proof(user_email, lower(sender_email));
create index if not exists user_proof_user_domain_idx on public.user_proof(user_email, lower(sender_domain));

alter table public.user_proof enable row level security;
revoke all on table public.user_proof from anon, authenticated;
