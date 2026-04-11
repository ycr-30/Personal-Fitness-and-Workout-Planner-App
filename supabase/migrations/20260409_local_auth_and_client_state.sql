create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.legacy_local_auth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null unique references public."User"(id) on delete cascade,
  account text not null,
  account_key text not null unique,
  email text unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legacy_local_auth_accounts_account_key_lower check (account_key = lower(account_key)),
  constraint legacy_local_auth_accounts_email_lower check (email is null or email = lower(email))
);

create index if not exists legacy_local_auth_accounts_account_key_idx
on public.legacy_local_auth_accounts (account_key);

create index if not exists legacy_local_auth_accounts_email_idx
on public.legacy_local_auth_accounts (email);

drop trigger if exists trg_legacy_local_auth_accounts_updated_at on public.legacy_local_auth_accounts;
create trigger trg_legacy_local_auth_accounts_updated_at
before update on public.legacy_local_auth_accounts
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.legacy_local_auth_verifications (
  id uuid primary key default gen_random_uuid(),
  account text not null,
  account_key text not null,
  email text,
  verification_code_hash text not null,
  password_hash text not null,
  password_salt text not null,
  registration_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legacy_local_auth_verifications_account_key_lower check (account_key = lower(account_key)),
  constraint legacy_local_auth_verifications_email_lower check (email is null or email = lower(email))
);

create index if not exists legacy_local_auth_verifications_account_key_idx
on public.legacy_local_auth_verifications (account_key, created_at desc);

create index if not exists legacy_local_auth_verifications_email_idx
on public.legacy_local_auth_verifications (email);

create index if not exists legacy_local_auth_verifications_expires_idx
on public.legacy_local_auth_verifications (expires_at);

drop trigger if exists trg_legacy_local_auth_verifications_updated_at on public.legacy_local_auth_verifications;
create trigger trg_legacy_local_auth_verifications_updated_at
before update on public.legacy_local_auth_verifications
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.user_client_state (
  id uuid primary key default gen_random_uuid(),
  server_user_id integer references public."User"(id) on delete cascade,
  supabase_user_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('device', 'user')),
  device_id text,
  state_key text not null,
  state_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_client_state_identity_check check (
    ((server_user_id is not null)::int + (supabase_user_id is not null)::int) = 1
  ),
  constraint user_client_state_device_scope_check check (
    (scope = 'device' and device_id is not null and length(trim(device_id)) > 0)
    or
    (scope = 'user' and device_id is null)
  )
);

create index if not exists user_client_state_server_user_idx
on public.user_client_state (server_user_id, updated_at desc);

create index if not exists user_client_state_supabase_user_idx
on public.user_client_state (supabase_user_id, updated_at desc);

create unique index if not exists user_client_state_server_unique_idx
on public.user_client_state (server_user_id, scope, device_id, state_key)
where server_user_id is not null;

create unique index if not exists user_client_state_supabase_unique_idx
on public.user_client_state (supabase_user_id, scope, device_id, state_key)
where supabase_user_id is not null;

drop trigger if exists trg_user_client_state_updated_at on public.user_client_state;
create trigger trg_user_client_state_updated_at
before update on public.user_client_state
for each row execute function public.set_current_timestamp_updated_at();
