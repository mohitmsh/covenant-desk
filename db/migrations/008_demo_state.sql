-- Fingerprint of the demo data a hosted demo was last seeded from, so a restart only resets it when the data changed.
create table demo_state (
  key    text primary key,
  value  text not null
);
