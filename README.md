# AK Hair & Beauty Salon Booking — v2

A deployable Next.js + Supabase + Resend salon booking application.

## Included
- Male / Female / Unisex categories
- Email/password signup, login, logout
- Supabase SSR auth with cookie sessions
- Email verification and password reset pages
- Customer services/stylists/appointments
- Smart availability API
- Server-side booking transaction
- PostgreSQL exclusion constraint for double-booking protection
- Admin dashboard and protected admin routes
- Service/stylist management
- Category-first multi-step booking flow with one-open-category accordions
- Stylist cards with square images and expandable details
- Admin stylist editor with photo upload, searchable service-selection subsection and responsive modal
- Working hours, blocked periods and salon early-closing management
- Coupon management and validation with one-time/reusable modes
- Month-calendar coupon history with stylist-cancellation and festival/event classifications
- Appointment management
- Customer list
- Audit log
- Resend React email template
- Security headers
- Environment variables

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Create a Supabase project.
4. Run `supabase/schema.sql` in Supabase SQL Editor.
5. Run every SQL file in `supabase/migrations/` in filename order, including the latest referral/gender rewards migration.
6. Configure Supabase Auth email settings / redirect URLs. For password recovery, allow the production `/reset-password` URL in Supabase Auth Redirect URLs.
7. Set environment variables. `RESEND_API_KEY` is used for salon/booking emails; Supabase Auth handles signup verification and password-reset emails.
8. `npm run dev`
9. Sign up once, then promote that profile to admin in Supabase:
   `update public.profiles set role='admin' where email='YOUR_EMAIL';`

## Production checklist
- Verify your sending domain in Resend.
- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`.
- The latest migration creates the public `stylist-images` Supabase Storage bucket; stylist photos are uploaded server-side using the service-role key.
- Configure Supabase email SMTP/templates and redirect URLs.
- Add platform-level rate limiting/WAF (for example Vercel Firewall) before launch.
- Test RLS and booking rules with separate customer/admin accounts.
- Configure backups and monitoring.

## Existing Supabase project: required admin migration

If this project is being deployed on an existing Supabase database, run:

`supabase/migrations/20260816_final_admin_data_fix.sql`

in the Supabase SQL Editor before testing the Admin → Stylists and Admin → Coupons pages. This migration adds the `stylists.image_url` and `coupons.event_name` columns, creates persistent coupon outreach history, and restores the server-side/admin permissions required by the cancellation recovery workflow.

The Next.js server must have a real `SUPABASE_SERVICE_ROLE_KEY` in its server environment. Do not expose that key with a `NEXT_PUBLIC_` prefix.

## V-07 deployment notes

### Password reset redirect
Password reset requests use the browser's current production origin rather than hard-coding localhost. In Supabase Dashboard, set Authentication → URL Configuration → Site URL to the real production website and add the production `/reset-password` URL to Redirect URLs. Do not leave the production Site URL as `http://localhost:3000`.

### Admin service permissions
Admin service-catalogue and stylist-service API calls use the server-only `SUPABASE_SERVICE_ROLE_KEY` after `requireAdmin()` authorization. The migration `20260817_admin_service_access.sql` provisions the required service-role grants.

### Stylist photos
Run the migrations in `supabase/migrations/` so the `stylists.image_url` column and `stylist-images` storage bucket exist before uploading photos.

### Referral menu
Clicking the signed-in user's name in the navbar opens exactly two account options: `Copy referral link` and `Referral points`. The referral-point calculation is not changed by this UI work.

## Referral menu and password reset setup

- Signed-in users can open their name in the desktop header or the mobile menu to copy their referral link and open the referral history page.
- `/referrals` shows completed referral rewards and the customers who generated them.
- Existing profiles without a referral code are repaired automatically by the app and by `supabase/migrations/20260817_referral_menu_and_history.sql`.
- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS website URL in the deployment environment. Supabase Authentication → URL Configuration must also allow the production `/reset-password` redirect URL.
