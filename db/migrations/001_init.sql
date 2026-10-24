create table borrowers (
  id              text primary key,
  name            text not null,
  facility_name   text not null,
  facility_limit  numeric not null,
  analyst         text not null
);

-- Versioned: amended terms are inserted as a new version.
create table covenant_definitions (
  id              text not null,
  version         int  not null,
  borrower_id     text not null references borrowers(id),
  name            text not null,
  metric          text not null check (metric in ('net_leverage', 'interest_cover', 'minimum_liquidity')),
  operator        text not null check (operator in ('lte', 'gte')),
  limit_value     numeric not null,
  watch_headroom  numeric not null default 0.10,
  effective_from  date not null,
  primary key (id, version)
);

create table documents (
  id              uuid primary key default gen_random_uuid(),
  borrower_id     text not null references borrowers(id),
  period          text not null,              -- YYYY-MM
  filename        text not null,
  sha256          text not null,
  storage_key     text not null,
  page_count      int  not null,
  received_at     timestamptz not null default now(),
  unique (borrower_id, sha256)
);

create table runs (
  id              uuid primary key default gen_random_uuid(),
  borrower_id     text not null references borrowers(id),
  period          text not null,
  document_id     uuid not null references documents(id),
  status          text not null default 'extracting'
                  check (status in ('extracting', 'tested', 'awaiting_signoff', 'approved')),
  started_by      text not null,              -- agent identifier or analyst name
  created_at      timestamptz not null default now()
);

-- Verified figures only. Rejected claims are logged in audit_events.
create table figures (
  run_id          uuid not null references runs(id),
  key             text not null,
  reported        numeric not null,
  scale           numeric not null,
  value           numeric not null,
  page            int  not null,
  quote           text not null,
  recorded_at     timestamptz not null default now(),
  primary key (run_id, key)
);

create table covenant_results (
  run_id            uuid not null references runs(id),
  covenant_id       text not null,
  covenant_version  int  not null,
  name              text not null,
  metric            text not null,
  operator          text not null,
  limit_value       numeric not null,
  actual            numeric not null,
  headroom          numeric not null,
  status            text not null check (status in ('pass', 'watch', 'breach')),
  formula           text not null,
  inputs            jsonb not null,
  primary key (run_id, covenant_id),
  foreign key (covenant_id, covenant_version) references covenant_definitions(id, version)
);

create table notes (
  run_id          uuid not null references runs(id),
  version         int  not null,
  body            text not null,
  author          text not null,
  created_at      timestamptz not null default now(),
  primary key (run_id, version)
);

create table approvals (
  run_id          uuid primary key references runs(id),
  note_version    int  not null,
  approver        text not null,
  approved_at     timestamptz not null default now(),
  foreign key (run_id, note_version) references notes(run_id, version)
);

create table audit_events (
  id              bigint generated always as identity primary key,
  run_id          uuid not null references runs(id),
  at              timestamptz not null default clock_timestamp(),
  actor           text not null,
  kind            text not null,
  detail          jsonb not null default '{}'
);
create index audit_events_run on audit_events (run_id, id);

create function audit_events_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only';
end $$;

create trigger audit_events_no_update before update or delete on audit_events
  for each row execute function audit_events_append_only();
