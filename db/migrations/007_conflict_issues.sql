-- Issues for a line printed with different amounts on two pages.
alter table review_issues drop constraint review_issues_kind_check;
alter table review_issues add constraint review_issues_kind_check
  check (kind in ('certificate_mismatch', 'subtotal', 'variance', 'period', 'conflict'));
