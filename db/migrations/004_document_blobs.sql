-- Document bytes, for deployments without a persistent filesystem. Keyed like the file store.
create table document_blobs (
  key    text primary key,
  bytes  bytea not null
);
