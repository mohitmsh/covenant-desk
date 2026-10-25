-- What the analyst is asked to do, and the evidence, impact and checks shown with each issue.
alter table review_issues add column category text not null default 'discrepancy'
  check (category in ('discrepancy', 'explanation', 'verify'));
alter table review_issues add column context jsonb not null default '{"evidence": [], "impact": null, "checks": []}';

alter table review_issues drop constraint review_issues_kind_check;
alter table review_issues add constraint review_issues_kind_check
  check (kind in ('certificate_mismatch', 'subtotal', 'variance', 'period'));

-- An analyst can mark an issue as caused by a misread figure rather than by the borrower.
alter table review_issues drop constraint review_issues_status_check;
alter table review_issues add constraint review_issues_status_check
  check (status in ('open', 'accepted', 'overridden', 'queried', 'extraction_error'));
