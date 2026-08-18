# Booking stylist visibility fix

The customer booking flow previously loaded every stylist linked to a service without filtering out soft-deleted stylists. Admin intentionally hides `deleted_at IS NOT NULL` stylists, so a deleted stylist could still appear during booking and create an apparent duplicate.

The booking query now:
- uses an inner relation to `stylists`;
- requires `stylists.active = true`;
- requires `stylists.deleted_at IS NULL`;
- de-duplicates returned stylist IDs defensively in the UI.

No database migration is required for this fix.
