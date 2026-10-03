# Data model

recruiter_access: user_id UUID PK references auth.users on delete cascade; email unique normalized text; active boolean default true; created_at/updated_at UTC timestamptz. No public policies; revoked anon/authenticated privileges.

auth_rate_limits: bucket text PK (keyed hash), window_start timestamptz, attempts integer. Atomic consume_auth_limit RPC locks a bucket, resets elapsed windows, increments up to the configured limit and returns boolean. Server-role execute only. Expired counters are pruned opportunistically in the RPC; no cron.

Session age marker: signed user UUID + issued-at epoch, HttpOnly browser-session cookie; twelve-hour age bound survives token refresh. No secrets in models or fixtures.
