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
- Working hours, blocked periods and salon early-closing management
- Coupon management and validation
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
5. Configure Supabase Auth email settings / redirect URLs.
6. Set environment variables.
7. `npm run dev`
8. Sign up once, then promote that profile to admin in Supabase:
   `update public.profiles set role='admin' where email='YOUR_EMAIL';`

## Production checklist
- Verify your sending domain in Resend.
- Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`.
- Configure Supabase email SMTP/templates and redirect URLs.
- Add platform-level rate limiting/WAF (for example Vercel Firewall) before launch.
- Test RLS and booking rules with separate customer/admin accounts.
- Configure backups and monitoring.
