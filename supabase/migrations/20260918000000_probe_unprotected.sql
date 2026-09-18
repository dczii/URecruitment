-- AC5 probe for #27 / #91. DO NOT MERGE. A table with no RLS and no revoke:
-- the migration lint, the RLS harness and the types check must all fail.
create table public.probe_unprotected (id integer primary key);
