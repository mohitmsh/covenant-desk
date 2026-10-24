-- Covenant results as reported by the borrower on its compliance certificate.
create table certificate_claims (
  run_id             uuid not null references runs(id),
  metric             text not null check (metric in ('net_leverage', 'interest_cover', 'minimum_liquidity')),
  reported           numeric not null,
  scale              numeric not null,
  value              numeric not null,
  claims_compliance  boolean not null,
  page               int  not null,
  quote              text not null,
  recorded_at        timestamptz not null default now(),
  primary key (run_id, metric)
);
