# AK menu test data

The migration `20260817_full_ak_menu_test_data.sql` populates the service catalogue from the supplied AK salon menu.

- 17 catalogue services across the menu categories.
- 150 service options/variants.
- Prices follow the supplied menu.
- Durations are exact where the menu states them; otherwise temporary test durations were assigned.
- Kids haircut is inactive because the supplied menu gives `15%` but does not give the base price needed by the booking engine.
- Temporary test availability is `10:00–20:00` every day only where a stylist has no existing hours.
- Existing stylist/service relationships are preserved; missing relationships are added so booking can be tested.

Apply with your normal Supabase migration workflow (for example `supabase db push`). Do not treat the test working hours as production business hours. Replace them before launch.
