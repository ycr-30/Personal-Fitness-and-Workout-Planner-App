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

create table if not exists public.auth_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('REGISTRATION', 'LOGIN_CODE', 'RESET_PASSWORD')),
  account_key text,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  resend_count integer not null default 0 check (resend_count >= 0),
  ip_address text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_verification_codes_email_lower check (email = lower(email)),
  constraint auth_verification_codes_account_key_lower check (account_key is null or account_key = lower(account_key))
);

create index if not exists auth_verification_codes_email_purpose_idx
on public.auth_verification_codes (email, purpose, created_at desc);

create index if not exists auth_verification_codes_account_key_purpose_idx
on public.auth_verification_codes (account_key, purpose, created_at desc);

create index if not exists auth_verification_codes_expires_idx
on public.auth_verification_codes (expires_at);

drop trigger if exists trg_auth_verification_codes_updated_at on public.auth_verification_codes;
create trigger trg_auth_verification_codes_updated_at
before update on public.auth_verification_codes
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.auth_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_password_reset_tokens_email_lower check (email = lower(email))
);

create index if not exists auth_password_reset_tokens_email_idx
on public.auth_password_reset_tokens (email, created_at desc);

create index if not exists auth_password_reset_tokens_expires_idx
on public.auth_password_reset_tokens (expires_at);

drop trigger if exists trg_auth_password_reset_tokens_updated_at on public.auth_password_reset_tokens;
create trigger trg_auth_password_reset_tokens_updated_at
before update on public.auth_password_reset_tokens
for each row execute function public.set_current_timestamp_updated_at();
