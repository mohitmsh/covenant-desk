alter table runs drop constraint runs_status_check;

alter table runs add constraint runs_status_check
  check (status in ('extracting', 'tested', 'awaiting_signoff', 'approved', 'failed'));

create index runs_active on runs (status, created_at) where status = 'extracting';
