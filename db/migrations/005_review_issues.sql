-- Where each verified quote sits on its page, as fractions of the page: {x, y, width, height}.
alter table figures add column box jsonb;
alter table certificate_claims add column box jsonb;

-- Problems found by code checks after extraction, each needing an analyst decision before sign-off.
create table review_issues (
  run_id       uuid not null references runs(id),
  key          text not null,
  -- Identifies the same problem in a borrower's later packs, for remembered decisions.
  fingerprint  text not null,
  kind         text not null check (kind in ('certificate_mismatch', 'subtotal', 'variance')),
  severity     text not null check (severity in ('high', 'medium')),
  title        text not null,
  detail       text not null,
  page         int  not null,
  box          jsonb,
  status       text not null default 'open' check (status in ('open', 'accepted', 'overridden', 'queried')),
  resolution   jsonb,
  created_at   timestamptz not null default now(),
  primary key (run_id, key)
);

-- Decisions an analyst asked to reapply when the same issue recurs for a borrower.
create table review_memories (
  borrower_id  text not null references borrowers(id),
  fingerprint  text not null,
  decision     text not null check (decision in ('accepted', 'overridden')),
  reason       text,
  decided_by   text not null,
  decided_at   timestamptz not null default now(),
  primary key (borrower_id, fingerprint)
);
