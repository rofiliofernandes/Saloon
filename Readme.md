 I'd make the README **practical rather than generic**: architecture, folder structure, database relationships, API routes, booking flow, admin flow, current features, known TODOs, and important rules.


```md
# AK Hair & Beauty Salon Booking System

A salon booking and management application built with Next.js, TypeScript, Tailwind CSS, Supabase, and Zod.

The application has two primary sides:

1. Customer-facing booking system
2. Admin-facing salon management system

The long-term goal is to make this a complete salon management platform, including online bookings, walk-ins, staff management, availability, coupons, reports, revenue analytics, and staff performance metrics.

---

# 1. Tech Stack

## Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React icons

## Backend

- Next.js App Router API routes
- Supabase
- Supabase Auth
- PostgreSQL
- Supabase RPC/functions where required

## Validation

- Zod

## Email

Booking confirmation emails are handled through:

`lib/email/send`

---

# 2. Project Structure

Main structure:

```text
luxe-salon-booking/
│
├── app/
│   ├── admin/
│   │   ├── [section]/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── api/
│   │   ├── admin/
│   │   │   ├── [section]/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │
│   │   ├── availability/
│   │   │   └── route.ts
│   │   │
│   │   ├── auth/
│   │   │   └── signout/
│   │   │       └── route.ts
│   │   │
│   │   ├── book/
│   │   │   └── route.ts
│   │   │
│   │   └── debug-auth/
│   │
│   ├── appointments/
│   │   └── page.tsx
│   │
│   ├── book/
│   │   └── page.tsx
│   │
│   ├── login/
│   ├── signup/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── services/
│   ├── stylists/
│   └── auth/
│       └── callback/
│
├── components/
│   └── admin-editor.tsx
│
├── lib/
│   ├── auth/
│   ├── email/
│   └── supabase/
│
├── supabase/
│   └── schema.sql
│
├── proxy.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

# 3. Customer Flow

The normal customer booking flow is:

```text
Customer
   │
   ▼
Choose Service
   │
   ▼
Choose Stylist
   │
   │
   └── Only stylists who provide the selected service
   │
   ▼
Choose Date
   │
   ▼
Check Availability
   │
   ├── Working hours
   ├── Existing appointments
   ├── Blocked periods
   ├── Salon closures
   └── Service duration
   │
   ▼
Choose Available Time
   │
   ▼
Optional Coupon
   │
   ▼
Confirm Appointment
   │
   ▼
Server checks availability again
   │
   ▼
Create appointment
   │
   ▼
Send confirmation email
```

---

# 4. Important Booking Rule

The frontend must never be trusted for availability.

The customer-facing booking page requests available slots from:

```text
/api/availability
```

However, the booking API checks availability again on the server/database when the customer confirms the appointment.

This prevents two customers from booking the same slot because of stale frontend data.

---

# 5. Booking Page

Main file:

```text
app/book/page.tsx
```

The booking page currently handles:

- Service selection
- Stylist selection
- Date selection
- Availability loading
- Time slot selection
- Coupon input
- Appointment submission

The stylist list must be filtered according to the selected service.

A stylist who does not provide a service should never appear as a selectable stylist for that service.

---

# 6. Availability API

File:

```text
app/api/availability/route.ts
```

Endpoint:

```text
GET /api/availability
```

Parameters:

```text
service_id
stylist_id
date
```

Example:

```text
/api/availability?service_id=...&stylist_id=...&date=2026-08-12
```

The API considers:

- Service duration
- Stylist working hours
- Day of week
- Existing confirmed appointments
- Blocked periods
- Salon closures
- Current time

Slots are currently generated in 30-minute increments.

---

# 7. Booking API

File:

```text
app/api/book/route.ts
```

Endpoint:

```text
POST /api/book
```

Expected fields:

```text
service_id
stylist_id
date
time
coupon
```

The API:

1. Checks authentication.
2. Validates input using Zod.
3. Converts the selected local Indian time into an ISO timestamp.
4. Rejects past appointments.
5. Calls the database appointment creation function.
6. Sends a booking confirmation email.
7. Redirects the customer to the appointments page.

The database is responsible for the final appointment validation.

---

# 8. Authentication

Authentication is handled through Supabase.

Important helper:

```text
lib/auth
```

Admin pages use:

```ts
requireAdmin()
```

Any admin functionality must remain protected server-side.

Do not rely only on hiding admin links in the frontend.

---

# 9. Admin Structure

Admin pages are under:

```text
/app/admin
```

The main admin layout is:

```text
app/admin/layout.tsx
```

The admin dashboard is:

```text
app/admin/page.tsx
```

Generic admin sections use:

```text
app/admin/[section]/page.tsx
```

Current sections include:

```text
/admin
/admin/appointments
/admin/services
/admin/stylists
/admin/availability
/admin/coupons
/admin/customers
/admin/settings
```

---

# 10. Admin API

Main dynamic admin API:

```text
app/api/admin/[section]/route.ts
```

Supported sections currently include:

```text
services
stylists
coupons
availability
blocked-periods
appointments
customers
```

Database mappings:

```text
services       → services
stylists      → stylists
coupons       → coupons
availability  → working_hours
blocked-periods → blocked_periods
appointments  → appointments
customers     → profiles
```

The API protects admin operations with:

```ts
requireAdmin()
```

---

# 11. Admin Editor

Main component:

```text
components/admin-editor.tsx
```

This is the generic CRUD UI currently used for several admin sections.

It supports:

- Listing records
- Searching records
- Adding records
- Removing records

Some sections have custom behavior.

Availability, coupons, stylists, and appointments should eventually receive dedicated interfaces instead of relying heavily on the generic editor.

The generic editor currently exposes database-oriented information and should NOT be considered the final UX.

---

# 12. Database

Main schema:

```text
supabase/schema.sql
```

Important tables include:

```text
profiles
services
stylists
stylist_services
working_hours
blocked_periods
salon_closures
appointments
coupons
coupon_usage
audit_logs
```

---

# 13. Important Database Relationships

## Profiles

Customers are stored in:

```text
profiles
```

The profile has a role such as:

```text
customer
admin
```

---

## Services

Services are stored in:

```text
services
```

Important information includes:

```text
id
name
category
description
price
duration_minutes
active
```

---

## Stylists

Stylists are stored in:

```text
stylists
```

Important information includes:

```text
id
name
category
bio
active
```

---

## Stylist Services

The relationship between stylists and services is stored in:

```text
stylist_services
```

This is a many-to-many relationship:

```text
Stylist
   │
   ├── Service A
   ├── Service B
   └── Service C
```

Do not store service IDs directly inside the stylist record unless the database design is intentionally changed.

---

# 14. Working Hours

Working hours are stored in:

```text
working_hours
```

They currently contain information such as:

```text
stylist_id
day_of_week
start_time
end_time
```

`day_of_week` follows the application's current JavaScript convention:

```text
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

The admin UI should hide this implementation detail from users.

Administrators should see:

```text
Monday
Tuesday
Wednesday
...
```

rather than:

```text
day_of_week: 1
```

---

# 15. Days Off

A stylist can have a day off.

For example:

```text
Arjun

Monday     Day off
Tuesday    10:00 AM - 10:00 PM
Wednesday  10:00 AM - 10:00 PM
```

The booking system should return no availability when the stylist is not working.

---

# 16. Blocked Periods

Blocked periods are stored in:

```text
blocked_periods
```

They can represent:

- Staff leave
- Lunch breaks
- Meetings
- Personal time
- Temporary unavailability
- Salon-wide blocked periods

Availability must exclude these periods.

---

# 17. Salon Closures

Salon-wide closures are stored in:

```text
salon_closures
```

Examples:

```text
Christmas
New Year's Day
Public holiday
Emergency closure
Renovation
```

If the salon is closed, availability should return no slots.

---

# 18. Appointments

Appointments are stored in:

```text
appointments
```

Current important fields include:

```text
id
customer_id
stylist_id
service_id
start_time
end_time
price
status
coupon_id
created_at
```

Relationships:

```text
appointments.customer_id → profiles.id

appointments.stylist_id → stylists.id

appointments.service_id → services.id

appointments.coupon_id → coupons.id
```

---

# 19. Appointment Status

The intended appointment lifecycle is:

```text
Confirmed
    │
    ▼
Completed
```

or:

```text
Confirmed
    │
    ▼
Cancelled
```

Future status such as:

```text
No-show
```

may also be added if needed.

---

# 20. Cancellation Rules

Customer cancellation should only be allowed when:

```text
appointment_time - current_time >= 1 hour
```

If there is less than one hour remaining, the customer should not be allowed to cancel.

Admin cancellation can be allowed regardless of the one-hour rule.

Every cancellation should record:

```text
cancelled_by
cancelled_at
cancellation_reason
```

The cancellation actor should distinguish between:

```text
customer
admin
```

Both the customer and admin should see the cancellation status.

---

# 21. Appointment Financial History

Appointments should eventually preserve the financial information at the time of booking.

Do not rely only on the current service price.

A service price can change later.

Example:

```text
Service current price:
₹600

Old appointment:
₹500
```

The appointment should continue to show:

```text
Original price: ₹500
```

Recommended appointment financial fields:

```text
original_price
discount_amount
final_price
coupon_id
coupon_code_snapshot
```

This ensures historical reports remain accurate.

---

# 22. Coupons

Coupons are stored in:

```text
coupons
```

Current schema includes:

```text
id
code
discount_type
discount_value
minimum_amount
usage_limit
used_count
expires_at
active
created_at
```

Coupon usage is tracked in:

```text
coupon_usage
```

---

# 23. Coupon UX

The admin coupon form should NOT expose vague raw database fields.

Instead of:

```text
Discount type
Discount value
Minimum amount
Usage limit
Expires at
```

the UI should clearly explain each field.

Example:

```text
Coupon code
CHRISTMAS15

Discount type
Percentage

Discount
15 %

Maximum discount
₹100

Minimum booking amount
₹500

Usage limit
100

Expires
25 Dec 2026
```

The exact business rules should be documented before changing the database.

---

# 24. Walk-in Appointments

A future feature is manual appointment creation by admin.

Admin should be able to create an appointment when a customer walks into the salon.

Example:

```text
Customer
Existing customer / New customer

Service
Haircut

Stylist
Arjun

Date
12 Aug 2026

Time
10:00 AM

Amount
₹500

Payment
Cash
```

The appointment should still be stored in the same `appointments` table.

Appointments should have a source such as:

```text
online
walk_in
admin
```

This allows reporting to distinguish online bookings from salon walk-ins.

---

# 25. Admin Appointment View

The current generic appointment editor is intentionally not the final design.

Admin should see human-readable information:

```text
12 Aug 2026
10:00 AM

John Fernandes
Signature Haircut
Arjun

₹500

Confirmed
Online
```

NOT:

```text
customer_id: 30453...
stylist_id: 315a...
service_id: f483...
```

UUIDs are implementation details and should normally be hidden from normal admin users.

---

# 26. Appointment Filters

The admin appointment screen should support:

```text
Today
Tomorrow
This week
This month
Custom date range
```

Status filters:

```text
All
Confirmed
Completed
Cancelled
```

Source filters:

```text
Online
Walk-in
Admin
```

Potential additional filters:

```text
Stylist
Service
Customer
Coupon
```

---

# 27. Customer Appointments

Customer appointments should be presented chronologically.

For future appointments:

```text
Soonest appointment first
```

For past appointments:

```text
Most recent first
```

The customer should not be presented with a confusing raw chronological dump.

Recommended structure:

```text
My appointments

Next appointment

Signature Haircut
Stylist: Arjun
Wed, 12 Aug · 10:00 AM
₹500
Confirmed
```

Then:

```text
Other upcoming appointments
```

Then:

```text
Past appointments
```

---

# 28. Customer Appointment Status

Customers should be able to clearly understand the state of each appointment.

Examples:

```text
Confirmed
Completed
Cancelled by you
Cancelled by salon
```

If cancelled:

```text
Cancelled by salon
Reason: Stylist unavailable
```

---

# 29. Stylist Profiles

The public stylist/team page should eventually support:

```text
Photo
Name
Category
Professional title
Bio
Specialities
Services offered
```

Example:

```text
Alex

Senior Stylist

Versatile styling for every client.

Specialities:
Haircuts
Styling
Colour

Services:
Signature Haircut
Signature Styling
```

Admin should eventually be able to upload/change stylist photos.

---

# 30. Admin Dashboard

The dashboard should provide a holistic view of the salon.

Initial metrics:

```text
Appointments today
Customers
Active services
Active stylists
```

Future metrics:

```text
Today's revenue
Weekly revenue
Monthly revenue
Completed appointments
Cancelled appointments
New customers
Returning customers
Average booking value
```

---

# 31. Dashboard Time Filters

Admin analytics should support:

```text
Today
Yesterday
This week
This month
Last month
This year
Custom range
```

The selected date range should be used consistently across dashboard reports.

---

# 32. Staff Performance

Future staff performance metrics should include:

```text
Appointments
Revenue
New clients
Returning clients
Average appointment value
Cancellation rate
```

Example:

```text
Staff Performance — August 2026

Stylist    Clients   Revenue    New   Returning
Arjun      82        ₹42,500    31    51
Priya      64        ₹36,200    28    36
Alex       51        ₹27,800    17    34
```

Admin should be able to sort by:

```text
Revenue
Appointments
New clients
Returning clients
Average booking value
```

---

# 33. Customer Retention Analytics

Future reporting should distinguish:

```text
New customer
Returning customer
```

Potential metrics:

```text
New customers this month
Returning customers this month
Repeat booking rate
Average visits per customer
Average customer lifetime spend
```

---

# 34. Stylist Switching

Future analytics may show whether customers return to the same stylist or switch.

Example:

```text
Arjun

Returning to Arjun: 42
Switched stylist: 9

Arjun → Priya: 7
Arjun → Alex: 2
```

This should be based on actual historical appointment data.

Do not infer this from a customer's current favourite stylist.

---

# 35. Revenue Reports

Future admin reports should distinguish:

```text
Gross revenue
Discounts
Net revenue
```

Example:

```text
Gross revenue:   ₹50,000
Discounts:        ₹3,500
Net revenue:     ₹46,500
```

Coupon usage should be included in these calculations.

---

# 36. PDF Reports

Admin should eventually be able to download reports as PDF.

Example:

```text
AK HAIR & BEAUTY SALON
Appointment Report
05-12-2025 → 05-12-2025

Date       Time      Customer   Service      Stylist   Amount
05-12-25   10:00 AM  John       Haircut      Arjun      ₹500
05-12-25   11:00 AM  Sarah      Styling      Priya      ₹800
```

Potential PDF reports:

```text
Appointments
Revenue
Staff performance
Customers
Coupons
```

PDF generation should happen server-side.

---

# 37. Audit Logs

Administrative changes should be tracked through:

```text
audit_logs
```

Examples:

```text
Admin created service
Admin created stylist
Admin created coupon
Admin cancelled appointment
Admin changed appointment
```

Audit logs are important for accountability.

---

# 38. Security Rules

Never trust client-side values for:

- Price
- Discount
- Appointment availability
- Stylist availability
- Customer identity
- Admin permissions
- Appointment ownership

The server/database must validate important business rules.

Admin operations must use:

```ts
requireAdmin()
```

Customer operations must verify the authenticated user.

---

# 39. Important Timezone Rule

The salon currently operates using Indian Standard Time:

```text
Asia/Kolkata
UTC+05:30
```

When converting booking dates/times, be careful not to accidentally interpret them as UTC.

Customer-selected local time should be converted to the correct ISO timestamp before storing it.

Display times should be formatted for the salon/customer locale.

---

# 40. Development Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
```

Start production server:

```bash
npm start
```

---

# 41. Before Committing Changes

Always run:

```bash
npm run build
```

The build must finish successfully before considering a change complete.

A successful build should reach:

```text
✓ Compiled successfully
✓ Finished TypeScript
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

# 42. Development Workflow

When changing functionality:

1. Understand the existing database structure.
2. Check the existing API.
3. Check authentication/authorization.
4. Make the smallest appropriate change.
5. Test the affected UI.
6. Test the API/business rule.
7. Run:

```bash
npm run build
```

8. Only then move to the next feature.

Avoid rewriting unrelated files while fixing one feature.

---

# 43. Current Architecture Philosophy

The application should separate:

```text
UI
↓
API
↓
Business rules
↓
Database
```

The UI should be responsible for presentation and user interaction.

The API should validate requests.

Business rules should be enforced server-side.

The database should remain the final source of truth.

---

# 44. Important UX Principle

The admin is a salon operator, not a database administrator.

Never expose database implementation details when a human-readable representation is possible.

Bad:

```text
stylist_id:
315a1997-82ee-4420...
```

Good:

```text
Stylist:
Arjun
```

Bad:

```text
day_of_week: 2
```

Good:

```text
Tuesday
```

Bad:

```text
discount_type: percentage
discount_value: 15
```

Good:

```text
15% off
```

The admin UI should always prioritize clarity.

---

# 45. Current Known Improvements / TODO

## High priority

- [ ] Appointment data foundation
- [ ] Store original price/final price/discount
- [ ] Preserve coupon information
- [ ] Appointment cancellation tracking
- [ ] Customer cancellation limit of 1 hour
- [ ] Admin appointment management UI
- [ ] Human-readable availability management
- [ ] Human-readable stylist management
- [ ] Better coupon management UI
- [ ] Walk-in appointment creation

## Medium priority

- [ ] Stylist profile photos
- [ ] Better stylist profile pages
- [ ] Customer history
- [ ] Appointment filters
- [ ] Dashboard date filters
- [ ] Revenue analytics
- [ ] New vs returning customers
- [ ] Staff performance metrics

## Later

- [ ] PDF reports
- [ ] Staff ranking
- [ ] Stylist switching analytics
- [ ] Coupon reports
- [ ] Customer lifetime value
- [ ] Advanced dashboard charts
- [ ] No-show tracking

---

# 46. Recommended Development Order

Do NOT implement all analytics first.

Recommended order:

```text
1. Appointment data foundation
        ↓
2. Cancellation system
        ↓
3. Coupon/discount history
        ↓
4. Admin appointment UI
        ↓
5. Walk-in appointments
        ↓
6. Availability UI
        ↓
7. Stylist profiles/photos
        ↓
8. Dashboard date filters
        ↓
9. Revenue analytics
        ↓
10. Staff performance
        ↓
11. Customer retention analytics
        ↓
12. PDF reports
```

This order is intentional.

Analytics and reports depend on clean historical appointment data.

---

# 47. Do Not Break These Existing Behaviours

When modifying the application, preserve:

### Booking

- Only compatible stylists should appear.
- Only genuinely available slots should appear.
- Server must re-check availability.
- Past bookings must not be allowed.

### Authentication

- Customers must authenticate before booking.
- Admin routes must remain protected.

### Database

- Do not remove historical appointment information.
- Do not overwrite historical prices when service prices change.
- Do not delete records unnecessarily when historical reporting depends on them.

### Admin

- Keep admin functionality server-protected.
- Prefer human-readable UI over raw database fields.

---

# 48. Important Principle for Historical Data

Appointments are historical records.

Once an appointment has happened, its historical information should remain accurate even if the salon later changes:

- Service price
- Service name
- Stylist information
- Coupon configuration
- Customer information

For example:

```text
August appointment:
Haircut
₹500
```

If the haircut later becomes:

```text
₹650
```

the old appointment should still report:

```text
₹500
```

This is especially important for:

- Revenue reports
- Staff performance
- PDF exports
- Accounting
- Customer history

---

# 49. Future Data Model Direction

The eventual appointment record should contain enough information to answer:

```text
Who was the customer?
What service did they receive?
Which stylist performed it?
When did it happen?
How much was the original price?
Was there a discount?
Which coupon was used?
How much did the customer actually pay?
Was it online or walk-in?
What was the appointment status?
Who cancelled it?
When was it cancelled?
When was it completed?
```

If the system can answer all of these reliably, the reporting system will be straightforward.

---

# 50. Final Development Goal

LUXE should eventually provide three experiences.

## Customer

```text
Discover services
      ↓
Choose stylist
      ↓
Choose time
      ↓
Book
      ↓
Manage appointments
      ↓
View history
```

## Admin

```text
Manage salon
      ↓
Manage staff
      ↓
Manage services
      ↓
Manage availability
      ↓
Manage bookings
      ↓
Manage walk-ins
      ↓
Manage coupons
      ↓
View customers
      ↓
View revenue
      ↓
View staff performance
      ↓
Download reports
```

## Database

Should provide a reliable historical source of truth for:

```text
Customers
Services
Stylists
Availability
Appointments
Coupons
Payments/prices
Cancellations
Walk-ins
Performance
Reports
```

---

# 51. Notes for Future Developers

Before implementing a feature, first determine:

1. Does this require a database change?
2. Does it require an API change?
3. Does it require an admin/customer UI change?
4. Does it affect historical data?
5. Does it affect permissions?
6. Does it affect availability?
7. Does it affect reporting?

Do not solve a database problem only in the UI.

Do not solve a security problem only in the UI.

Do not calculate historical financial data from current service/coupon values if those values can change.

When in doubt, preserve historical data rather than overwriting it.

---

# LUXE Development Status

The application is currently functional and the production build succeeds.

The next major development milestone is:

**Appointment Data Foundation**

Once this is complete, proceed to:

**Cancellation → Coupons → Admin Appointments → Walk-ins → Analytics → PDF Reports**
```

One important thing: **don't replace your existing `README.md` with this until you've checked whether your current README contains Supabase setup/environment-variable instructions that aren't in the code/context we've discussed.** If it does, keep those sections and add this documentation underneath them.
