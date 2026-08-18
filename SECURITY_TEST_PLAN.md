# Post-patch verification plan

Run these in the project root after extracting the hardened ZIP.

## 1. Install and static checks

```bash
npm ci
npm run lint
npm run build
```

All three should complete successfully.

## 2. Environment

Copy `.env.example` to `.env.local` and provide test/staging values. Do not use production secrets for local testing.

Generate server-only secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use the first for `RATE_LIMIT_SECRET` and the second for `MARKETING_UNSUBSCRIBE_SECRET`.

## 3. Authentication tests

Create:

- Customer A
- Customer B
- Admin
- Owner

Verify:

- customer signup requires 12+ characters in the UI
- wrong password does not authenticate
- password reset works
- expired reset links fail
- no password appears in database application tables
- admin invitation does not ask the owner to create/see the admin password
- invited admin can choose their own password
- existing customer promoted to admin keeps their old password
- disabled admin cannot authenticate
- Owner cannot be disabled by the admin-management UI

## 4. Authorization / IDOR tests

While logged in as Customer A:

- call Customer B's appointment cancellation endpoint with B's appointment UUID
- try to retrieve/modify B's data by changing UUIDs
- call an `/api/admin/*` endpoint directly
- try to redeem referral points using another user's UUID

Expected: unauthorized actions fail.

## 5. Booking tests

- Book a valid future appointment.
- Attempt the exact same stylist/time twice concurrently.
- Attempt a booking with a different service/price/duration than the UI selected by modifying the request.
- Attempt to book a stylist for a service they do not provide.
- Attempt a past appointment.

Expected: the database remains authoritative and only valid bookings succeed.

## 6. CSRF tests

From another origin/domain, attempt POST requests to:

- `/api/book`
- `/api/appointments/cancel`
- `/api/referrals/redeem`
- `/api/referrals/validate`
- `/api/auth/signout`
- representative `/api/admin/*` endpoints

Expected: cross-origin mutations are rejected.

## 7. Rate-limit tests

Rapidly repeat a high-risk endpoint.

Expected: requests eventually receive HTTP 429 for the hardened public endpoints. Admin requests are also throttled; the exact response status may depend on the individual legacy route's error wrapper.

For production, also configure a distributed edge/WAF limiter because the application limiter is process-local defense in depth.

## 8. Upload tests

Try uploading:

- valid JPG
- valid PNG
- valid WebP
- a text file renamed to `.jpg`
- a file with a fake MIME type
- an image over 5 MB
- a multipart request over the request limit

Expected: only real supported image formats within the size limit are accepted.

## 9. Browser/security header checks

Open DevTools -> Network -> any application response and verify headers include:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- `Permissions-Policy`

## 10. Secret exposure test

After `npm run build`, search the generated client output for the service-role key name/value. The service-role secret must never appear in client JavaScript.

Also search the repository:

```bash
grep -RInE 'SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|MARKETING_UNSUBSCRIBE_SECRET|RATE_LIMIT_SECRET' . --exclude-dir=node_modules --exclude-dir=.next
```

Only variable names/placeholders/documentation should appear; actual secret values must not.
