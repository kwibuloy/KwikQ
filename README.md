# KwikQ: virtual queues for clinics

KwikQ replaces the crowded waiting room with a live ticket. Patients pick a doctor, get a numbered ticket and follow their place in line from anywhere. Clinic staff run every doctor's queue from one dashboard: call next, start and finish visits, skip, close the queue, manage doctors and invite colleagues.

## Tech stack
* **Frontend**: React 19, Vite, CSS modules (light/dark design tokens)
* **Backend**: Express 5 (TypeScript), Node.js 22
* **Database & auth**: PostgreSQL, Supabase (Auth + Realtime)
* **DevOps & APIs**: Docker, Kubernetes (kind/minikube), Nginx, Resend, GitHub Actions

## Key features
* **Queue state machine**: `waiting → called → in-consultation → served / cancelled / skipped`, each transition is a single conditional `UPDATE ... RETURNING`.
* **Race-free tickets**: ticket numbers come from an atomic per-doctor, per-day counter, backed by a unique index on `(doctor_id, ticket_day, ticket_number)`.
* **Real-time tracking**: Supabase Realtime on the admin side, 7-second change-detected polling on the patient side.
* **Server-side roles**: Supabase verifies the JWT; the role always comes from our own `users` table (never from user-editable `user_metadata`).
* **Invite-only staff**: admin accounts need a single-use invitation code, claimed atomically in the same transaction as the account row.
* **Hardened API**: helmet, CORS allow-list, rate limits on login/register/invitation checks, verified TLS to Postgres, no internal error details in responses.

## Getting started
**Prerequisites**: Node.js 22+, a PostgreSQL database, a Supabase project. Docker Desktop and minikube/kind for the Kubernetes deploy.

**Environment** (copy the examples, then fill them in):
* `Backend/.env` from `Backend/.env.example`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`. TLS to the database is verified by default; set `DB_SSL_CA` to your provider's CA certificate (Supabase: *Project Settings → Database → SSL*), or `DB_SSL=disable` for a local database.
* `Frontend/.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

**Database migration** (once per database):
```bash
cd Backend && npm run db:migrate
```

**Run locally**:
```bash
# Terminal 1: API
cd Backend && npm install && npm run dev

# Terminal 2: web app
cd Frontend && npm install && npm run dev
```

**Checks** (the same ones CI runs):
```bash
cd Backend && npm run lint && npm run typecheck && npm test
cd Frontend && npm run lint && npm run typecheck && npm test && npm run build
```
The backend's database integration tests (concurrent ticket numbers, single-use invitations) run when `TEST_DATABASE_URL` points at a throwaway Postgres database. They drop and recreate tables, so never point it at real data.

**Deploy to local Kubernetes**:
1. Copy each file in `k8s/secret-templates/` to `k8s/` and fill in real values. The copies are git-ignored.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your shell.
3. Run:
```powershell
./deploy.ps1
```

## Performance benchmarks
Tested with 50 requests, 10 concurrent users (0 failures across 200 total requests), using `load-test.js`.

| Endpoint | Avg latency | p95 latency | Throughput |
|----------|-------------|-------------|------------|
| GET `/doctors` (unauthenticated) | 389ms | 1,588ms | 19.8 req/sec |
| GET `/doctors` (authenticated) | 185ms | 231ms | 43.6 req/sec |
| GET `/queue/patient-status` | 689ms | 1,243ms | 12.8 req/sec |

## Known limitations
* **Local deployment**: the Kubernetes config targets minikube/kind; a cloud setup needs an ingress.
* **Single process**: the API runs one Node process per pod; scale with replicas.
* **Hand-written SQL migrations**: `Backend/db/migrations` is applied in order by `npm run db:migrate`; there is no migration history table yet.

## License
MIT License
