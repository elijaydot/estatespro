-- Wave 3 webhook delivery persistence foundation

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  event_type text not null,
  target_url text not null,
  secret_ref text not null,
  is_active boolean not null default true,
  max_attempts integer not null default 5,
  timeout_ms integer not null default 5000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_attempts >= 1 and max_attempts <= 20),
  check (timeout_ms >= 1000 and timeout_ms <= 30000)
);

create table if not exists public.webhook_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  event_id text not null,
  correlation_id text,
  payload jsonb not null,
  signature text,
  attempt integer not null,
  status_code integer,
  success boolean not null default false,
  error_message text,
  duration_ms integer,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  check (attempt >= 1)
);

create unique index if not exists webhook_delivery_attempts_unique
  on public.webhook_delivery_attempts(endpoint_id, event_id, attempt);

create table if not exists public.webhook_dead_letters (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  event_id text not null,
  correlation_id text,
  payload jsonb not null,
  final_status_code integer,
  failure_reason text,
  total_attempts integer not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  check (total_attempts >= 1)
);

create unique index if not exists webhook_dead_letters_unique
  on public.webhook_dead_letters(endpoint_id, event_id);
