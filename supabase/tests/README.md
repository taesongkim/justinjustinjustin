# Core Exam database policy tests

Run the complete local database gate:

```sh
npm run core-exam:test-db
```

The command rebuilds the local database from checked-in migrations, lints the
resulting schema, and runs the pgTAP identity/policy suite. Docker Desktop and
the local Supabase stack are required.

Tests create only transaction-scoped fixtures and roll them back.

Supabase CLI 2.40.7 can briefly report a Storage `502` after a successful local
reset while Docker restarts services. The test runner tolerates only that exact
post-migration condition, waits for stack health, and still requires schema lint
and pgTAP to pass. All other reset failures stop immediately.
