# Security hardening and production checklist

This project includes application-level security hardening, but production security also depends on the hosting platform and Supabase project configuration.

## Implemented in the codebase

- Service-role Supabase client is server-only and is never exposed as a `NEXT_PUBLIC_*` variable.
- Debug authentication endpoint removed.
- Same-origin checks are applied to authenticated mutation flows.
- High-risk mutation endpoints have process-local rate limiting as defense in depth.
- Admin/owner API traffic is rate limited per authenticated user.
- Passwords are never stored in the application database.
- Administrator creation now uses Supabase invitation/password setup instead of transmitting a temporary password through the dashboard.
- Password UI minimum is 12 characters.
- Raw database errors are suppressed on hardened endpoints and logged server-side.
- File uploads validate both declared MIME type and file signatures.
- Upload request/file size is bounded.
- Security headers include CSP, HSTS, frame protection, referrer policy and permissions policy.
- Callback `next` parameters are restricted to local paths to prevent open redirects.
- Unsubscribe token comparison handles malformed token lengths safely.
- Admin dynamic inserts use explicit field allowlists instead of arbitrary client-supplied columns.
- Supabase auth/profile trigger is recreated in a dedicated hardening migration.

## Required before production

### Supabase Auth

In the Supabase dashboard:

1. Configure the production Site URL.
2. Add only the real production callback URLs to the redirect allowlist.
3. Set the password minimum to at least 12 characters.
4. Enable MFA for Owner and administrator accounts.
5. Enable CAPTCHA/bot protection for authentication if supported by the chosen Supabase plan/configuration.
6. Review Auth rate limits.

### Secrets

- Set `SUPABASE_SERVICE_ROLE_KEY` only as a server-side secret.
- Set a random `RATE_LIMIT_SECRET` (`openssl rand -hex 32`).
- Set a random `MARKETING_UNSUBSCRIBE_SECRET` (`openssl rand -hex 32`).
- Rotate any secret that has ever been committed to Git or shared publicly.

### Hosting / edge protection

The in-process limiter is intentionally only defense in depth. Production should also use a distributed rate limiter/WAF at the hosting edge (for example the controls supplied by the chosen hosting provider). This prevents abuse from bypassing the limit by reaching multiple server instances.

### Database

Apply all migrations from a clean database and verify RLS, grants and function privileges. Never paste the service-role secret into SQL, browser code, screenshots or support tickets.

## Suggested manual tests

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Create two normal customer accounts.
5. Verify Customer A cannot read/cancel Customer B's appointment by changing IDs.
6. Verify a customer cannot call an admin API successfully.
7. Verify an admin cannot disable the Owner.
8. Verify an Owner can invite an administrator and the invitee sets their own password.
9. Verify an existing customer promoted to admin keeps their existing password.
10. Verify malformed image files renamed to `.jpg`, `.png` or `.webp` are rejected.
11. Verify oversized uploads are rejected.
12. Verify cross-origin POST requests to booking/cancellation/referral endpoints are rejected.
13. Verify repeated booking/referral/admin requests receive HTTP 429 responses.
14. Verify password reset links work and expired links do not.
15. Verify no `SUPABASE_SERVICE_ROLE_KEY`, Resend key, or other server secret appears in browser bundles.
16. Test booking twice for the same stylist/time concurrently; only one should succeed.
17. Test coupon/referral redemption with another customer's IDs; it must fail.
