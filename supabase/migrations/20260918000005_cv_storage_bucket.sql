-- Private cv-files Storage bucket for original CV and JD files (#114).
-- Bucket lock-down mirrors ADR-0002 D2: private, no policies for anon/authenticated.

insert into storage.buckets (id, name, public)
values ('cv-files', 'cv-files', false);

-- No storage.objects policies for anon/authenticated: the bucket is server-only, reached only via the secret key, which bypasses RLS. Lock-down is by omission plus the secret-key-only access model (ADR-0002 D2), not a false-permissive policy.
