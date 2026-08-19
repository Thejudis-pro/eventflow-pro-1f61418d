-- The one previously-bootstrapped staff account is judismetognon@gmail.com
-- (see 20260813120000). This session's actual account is
-- judismetognon2@gmail.com -- a different address -- so nobody could
-- approve it through the self-service Accès organisateurs UI (chicken-and-
-- egg: approving requires already being approved). Idempotent no-op if
-- that account hasn't signed up at /staff/signup yet; re-run-safe either way.
UPDATE public.staff_profiles
SET approved = true
WHERE lower(email) = 'judismetognon2@gmail.com';
