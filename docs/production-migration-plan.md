# Production migration: atiom-leave → AWS serverless

---

## Implementation status (Phase 1 — local dev) ✅

**Phase 1 is implemented and verified end-to-end against DynamoDB Local.** Real-AWS
deploy is intentionally *not* run/verified yet (infra is scaffolded only).

### Done
- [x] **`shared/`** — `types.ts`, `logic/{leaveCalc,stateMachine,overlap}.ts`, `ids.ts`
  (`crypto.randomUUID`), `seed.ts` (the demo dataset). Imported by both web and api via a
  **`#shared/*` subpath import** (package.json `imports` + tsconfig path) — works in Vite,
  Bun and Vitest natively. `src/types/index.ts` and `src/logic/*` are thin re-exports → no
  churn on existing `#/types` / `#/logic` import sites.
- [x] **`api/`** — single **Hono** app (`handler.ts`); `db.ts` (DocumentClient, endpoint from
  env); `tables.ts` (canonical schema for the 6 tables + GSIs); `auth.ts` (caller derived from
  JWT, never client body; local-dev-token + Cognito-JWT modes in one path); `repositories/*`
  (DynamoDB port of the old `src/store/*` mutations; multi-entity writes use
  **`TransactWriteCommand`** with optimistic-lock retry on the balance condition);
  `dev-server.ts`; `lambda.ts` (`hono/aws-lambda`).
- [x] **Local infra** — `docker-compose.yml` (DynamoDB Local :8000 + admin UI :8001);
  `scripts/createTables.ts`, `scripts/seed.ts` (reuses `shared/seed`), `scripts/seedCognito.ts`
  (no-op without a real pool).
- [x] **Client cutover** — `src/lib/{config,api}.ts`, pluggable `src/lib/auth.ts`
  (local default; Cognito via `auth.cognito.ts` + `amplify.ts`, lazy-loaded). `useAuth` is now
  async and driven by `GET /me`. `login.tsx` is email+password; `_auth`/`index` guards are
  async; `UserMenu` lost the dev switcher/reset. Queries call `api.*` and **dropped the
  `actor`/`employee` args**. Synchronous store readers (`getUserById` / `getAuditByRequest` /
  `getDirectReports`) replaced by `useUsers()` maps + queries. `queryClient` staleTime 30s,
  retry 1.
- [x] **Deleted** `src/store/*`, `vercel.json`, the seeded user-picker/role-switcher.
- [x] **`infra/`** — CDK scaffold (`backend-stack.ts`, `web-stack.ts`, `tables.ts`, `bin/app.ts`).
  Written, **not deployed**.

### Verified (local)
web `tsc` ✓ · api `tsc` ✓ · 21 unit tests ✓ · `vite build` ✓ · 14-assertion end-to-end API
flow against DynamoDB Local (create → manager queue → approve → balance `used` 2→3 →
notification → audit → request-cancellation → approve → balance restore 3→2 → HR entitlement)
plus authorization 403s (employee can't approve / set entitlement / view another's requests).

### Deviations from the plan below (and why)
- **Shared alias is `#shared/*`** (subpath import), not `@shared/*` — resolves everywhere with
  no Vite alias needed.
- **Dev server uses Bun's native fetch server** (default export), not `@hono/node-server` —
  that package crashes under Bun (`socket.destroySoon is not a function`). Dependency dropped.
- **`managerId` is omitted (not stored as NULL) for the top-of-tree user** — DynamoDB forbids
  NULL on a GSI key attribute (`byManager` hash). Restored to `null` on read.
- **Local auth needs no AWS**: `AUTH_MODE=local` issues/accepts a `dev.<base64url(email)>`
  token; the API trusts it and resolves the profile by email. Cognito path is coded but not
  exercised locally.
- **API port is 3100** in `.env` (web 3000) to avoid a clash with another local app; the
  plan's 3001 is fine on a clean machine.

### Run it
```bash
cp .env.example .env
bun run db:up            # DynamoDB :8000/admin :8001 · MinIO :9000/console :9001 · Mailpit :1025/UI :8025
bun run local:setup      # create tables + S3 bucket + seed   (Phase 2: was api:tables && api:seed)
bun run api:dev          # API :3100   (one terminal)
bun run dev              # web :3000   (another terminal)
```
Sign in with any seeded email (password ignored locally): `alice@atiom.app` (employee),
`dana@atiom.app` (manager), `frank@atiom.app` (HR). Reset data: `bun run local:reset`.
Phase-2 surfaces: attach a doc on a request → MinIO console (`minioadmin`/`minioadmin`);
outbound email → Mailpit UI at http://localhost:8025; HR → Employees → **Add employee**.

---

## Implementation status (Phase 2 — local dev) ✅

**Phase 2 is implemented and verified end-to-end locally.** Each of the three
pillars is **mode-driven by env** (same `local|cognito` switch Phase 1 uses for
auth), so Phase 3 = flip the mode + provision the AWS resource via CDK, *not* a
rewrite. Real-AWS deploy is intentionally not run yet.

### Done
- [x] **S3 attachments + presigned URLs** — `api/src/storage.ts` (S3 client;
  endpoint-driven exactly like `db.ts`: `S3_ENDPOINT` set → MinIO with
  path-style, unset → real S3). Routes `POST /attachments/presign` (presigned
  PUT, mime allowlist + 10 MB cap) and `GET /attachments/download` (presigned
  GET). `Attachment.mockDataUrl` → **`storageKey`**. Client uploads bytes
  **straight to S3** (API never proxies): `AttachmentUpload.tsx` presigns →
  `PUT`s → stores the key; `LeaveRequestDetail.tsx` downloads via a presigned
  GET. `api/scripts/createBucket.ts` (`bun run api:bucket`).
- [x] **Email** — `api/src/email.ts`, `EMAIL_MODE` = `console` (default,
  zero-dep) | `smtp` (Mailpit, via lazy `nodemailer`) | `ses` (lazy
  `@aws-sdk/client-ses`, Phase 3). Best-effort `emailEvent()` fired after each
  request transaction (submit/edit/approve/reject/cancel flow) — **augments**
  the in-app `Notification`, never blocks or fails the mutation.
- [x] **HR admin user-create** — `POST /users` (HR-only): `api/src/identity.ts`
  `provisionIdentity()` (no-op locally; `AdminCreateUser` in cognito mode,
  lazy-loaded), then writes the Users profile (unique-email guarded) and seeds
  one balance row per policy (`balances.seedUserBalances`). UI: "Add employee"
  modal on `src/routes/_auth/hr/employees.tsx` (`useCreateUser`).
- [x] **Local infra** — `docker-compose.yml` adds **MinIO** (:9000 API / :9001
  console, `MINIO_API_CORS_ALLOW_ORIGIN=*`) and **Mailpit** (:1025 SMTP / :8025
  UI). New deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`,
  `@aws-sdk/client-ses`, `nodemailer`. `bun run local:setup` = tables + bucket +
  seed.

### Verified (local)
web `tsc` ✓ · api `tsc` ✓ · 21 unit tests ✓ · `vite build` ✓ · **17-assertion
end-to-end smoke** ✓: presign→PUT-to-MinIO→presign-download→byte round-trip +
mime/size 400s; HR create-user→201 + initials + no cognitoSub (local) + 8
seeded balances + new user signs in via `/me` + dup-email 409 + employee-create
403; submit→manager email + approve→employee email landing in Mailpit (confirms
`nodemailer` works under Bun).

### Deviations from the Phase-2 plan below (and why)
- **MinIO has no per-bucket CORS API** (`PutBucketCors` → `501 NotImplemented`).
  CORS is global in MinIO via `MINIO_API_CORS_ALLOW_ORIGIN` (compose env); the
  real S3 bucket's CORS is a Phase-3 CDK concern.
- **Email default is `console`, not SMTP** — bulletproof and dependency-free for
  CI / pure-local; `smtp`+Mailpit is the opt-in "see the email" path (and is
  what the smoke test exercises). `nodemailer`/`@aws-sdk/client-ses` are both
  **lazy-imported**, so the unused transport is never loaded.
- **Attachments upload client-side direct to S3** (presigned PUT), so the
  Lambda/API never streams file bytes — cheaper and Lambda-payload-safe.

### Not built (Phase 3, per plan): CDK provisioning of the S3 reports bucket
(+ bucket CORS/IAM), SES domain/sender verification + `ses:SendEmail` grant, and
the Lambda `cognito-idp:AdminCreateUser` grant — i.e. deploying these same code
paths against real AWS by flipping `S3_ENDPOINT`/`EMAIL_MODE`/`AUTH_MODE`.

---

## Context

`atiom-leave` is today a **client-only SPA** (TanStack Start in SPA mode, `ssr:false`). All
data lives in `localStorage` via `src/store/*`; the UI reads/writes it through TanStack Query
hooks in `src/queries/*`. Auth is mocked — a user-picker writes `{userId, role}` to
`localStorage`, no passwords, no server. This is a POC shape.

Goal: turn it into a real production app on AWS with a real database and real auth, while
keeping the existing React UI and domain logic. Target stack:

```
Browser (React SPA)
  ├─ Auth   → Cognito User Pool (email + password)            [via AWS Amplify Auth]
  ├─ API    → API Gateway HTTP API (Cognito JWT authorizer) → Lambda handlers → DynamoDB
  └─ Static → CloudFront → S3 (SPA bucket)
Phase 2 adds: S3 reports bucket (presigned URLs), SES email, Cognito Admin user-creation
```

**Decisions locked** (from clarification):
- Backend = **API Gateway HTTP API + Lambda** (SPA stays pure static, not TanStack server fns).
- Auth = **Cognito email + password** (no OTP, no MFA in v1), frontend via **AWS Amplify Auth**.
- Infra = **AWS CDK (TypeScript)**.
- Delivery = **phased**. Phase 1 = core, deployable end-to-end. Phase 2 = attachments/SES/admin-create.
- DynamoDB table count is my design call (the "4 tables" note was retracted) → 6 entity tables, audit co-located under requests.

The current domain logic is clean and reusable: pure functions in `src/logic/`
(`leaveCalc.ts`, `stateMachine.ts`, `overlap.ts`) and the mutation logic in `src/store/*`
(`createRequest`, `approveRequest`, `setEntitlement`, …). The migration **ports the store
mutations to DynamoDB inside Lambda and reuses `src/logic/*` unchanged.**

---

## Target repository structure

Move shared domain code so both the web app and the Lambda can import it; add `api/` and `infra/`.

```
shared/                  # NEW — imported by both web (src) and api
  types.ts               # moved from src/types/index.ts (entity types)
  logic/                 # moved from src/logic/* (pure, already tested)
    leaveCalc.ts  stateMachine.ts  overlap.ts
  ids.ts                 # generateId → crypto.randomUUID() (multi-instance safe)
api/                     # NEW — Lambda backend
  src/handler.ts         # Hono router (single Lambda) — maps routes → repositories
  src/db.ts              # DynamoDBDocumentClient (endpoint from env for local)
  src/auth.ts            # derive caller identity+role from JWT claims (req context)
  src/repositories/      # DynamoDB ports of src/store/*
    users.ts  departments.ts  policies.ts  requests.ts  balances.ts  notifications.ts
  src/dev-server.ts      # @hono/node-server for local dev (port 3001)
  scripts/seed.ts        # write seed dataset to DynamoDB (BatchWrite)
  scripts/seedCognito.ts # AdminCreateUser the seed users into the pool
infra/                   # NEW — AWS CDK app
  bin/app.ts  lib/backend-stack.ts  lib/web-stack.ts  lib/tables.ts
src/                     # existing web app (TanStack Start SPA, stays static)
docker-compose.yml       # NEW — DynamoDB Local
```

To avoid churning ~every import of `#/types`, keep `src/types/index.ts` as a thin re-export
of `shared/types`. Same for `src/logic/*` → re-export from `shared/logic/*` (or update the
handful of import paths). Use a bun workspace or tsconfig path alias (`@shared/*`) so `api/`
and `infra/` resolve `shared/`.

---

## DynamoDB data model (6 tables, on-demand billing)

Names prefixed per environment, e.g. `atiom-leave-${env}-Users`.

| Table | PK | SK | GSIs | Notes |
|---|---|---|---|---|
| **Users** | `id` | — | `byEmail`(email), `byManager`(managerId, SK name) | add `cognitoSub`; map Cognito↔profile by email |
| **Departments** | `id` | — | — | small; Scan for list |
| **LeavePolicies** | `id` | — | — | 8 rows; Scan for list; HR-editable |
| **LeaveRequests** | `pk`=requestId | `sk` | `byEmployee`(employeeId,createdAt), `byManager`(managerId,createdAt), `byStatus`(status,updatedAt) | `sk="REQ"` for the request item, `sk="AUDIT#<ts>#<id>"` for co-located audit entries. GSI keys present on REQ items only so audit rows don't pollute indexes |
| **LeaveBalances** | `userId` | `<year>#<leaveType>` | — | GetItem point read; Query by user+year via `begins_with(sk,"<year>#")` |
| **Notifications** | `recipientId` | `<createdAt>#<id>` | — | Query by recipient; mark-read needs recipientId+sk (client knows current user) |

**Access-pattern mapping** (replaces the array filters in `src/store/*`):
- `getRequestById` → GetItem(pk=id, sk="REQ"); `getAuditByRequest` → Query(pk=id, begins_with sk "AUDIT#").
- `getRequestsByEmployee/Manager` → Query `byEmployee`/`byManager`. `getActiveApprovedRequests`/`getPendingForManager` → Query `byStatus` (or `byManager` + filter).
- `getBalancesByUser` → Query Balances(pk=userId). `getBalance` → GetItem.
- `getNotificationsForUser` → Query Notifications(pk=recipientId).
- `getUsers`/`getDepartments`/`getLeavePolicies` → Scan (tiny tables). `getDirectReports` → Query `byManager`.

**Atomicity:** multi-entity mutations use **`TransactWriteCommand`** to preserve the current
`mutateStore` all-or-nothing semantics:
- `createRequest` → Put REQ + Put AUDIT + Put Notification.
- `approveRequest` → Update REQ + Put AUDIT + **Update Balance.used** + Put Notification.
- `decideCancellation(approve)` → Update REQ + Put AUDIT + **restore Balance.used** + Put Notification.
- `setEntitlement`/`adjustBalance` → Update Balance + Put AUDIT.
Balance `used` is floored at 0 today; in DynamoDB use read-then-conditional-Put (optimistic
condition on prior `used`) inside the transaction, retry on `ConditionalCheckFailed`.

**IDs:** runtime IDs move server-side and switch to `crypto.randomUUID()` (the current
module-local counter in `src/lib/utils.ts` collides across concurrent Lambda invocations).

---

## API design (HTTP API, all routes behind the Cognito JWT authorizer)

One Lambda running a **Hono** router (keeps domain logic in one place, trivial local dev).
The Lambda derives the **caller** from JWT claims (`sub`/`email`) → Users profile → role; it
**no longer trusts client-supplied `actor`/`employee`** (security improvement). Authorization:
employees act on self, managers on their direct reports, HR on everyone.

```
GET   /me                              → caller's profile (+role)
GET   /users            GET /users/:id           PATCH /users/:id
GET   /users/:id/reports               GET /departments
GET   /policies         PATCH /policies/:id
GET   /balances?userId=&year=          GET /balances            (HR: all)
POST  /balances/entitlement            POST /balances/adjust
GET   /requests?employeeId=|managerId=|status=   GET /requests (HR: all)
GET   /requests/:id     GET /requests/:id/audit
POST  /requests         PATCH /requests/:id
POST  /requests/:id/approve | /reject | /cancel | /request-cancellation | /decide-cancellation
GET   /notifications?userId=           POST /notifications/:id/read    POST /notifications/read-all
```

CORS configured for the CloudFront origin. Request/response bodies are the existing entity types.

---

## Client changes (`src/`)

The SPA **stays static** (keep `tanstackStart({ spa:{ enabled:true }})`; build → `dist/client`).
Net change: data layer talks to the API with a Cognito JWT instead of localStorage.

1. **`src/lib/api.ts`** (new): fetch wrapper — base `import.meta.env.VITE_API_URL`, attaches
   `Authorization: Bearer <idToken>` from Amplify `fetchAuthSession()`, JSON encode/decode,
   error normalization.
2. **`src/queries/*`** (`requests.ts`, `balances.ts`, `directory.ts`, `notifications.ts`):
   swap `queryFn`/`mutationFn` from `#/store/*` calls to `api.*` calls. **Drop `actor`/`employee`
   args** — server derives caller. Keep `invalidateQueries()` on success. In `queryClient.ts`
   bump `staleTime` (~30s) and allow `retry: 1` (now real network).
3. **Auth (Amplify)**: `src/lib/amplify.ts` (new) calls `Amplify.configure({Auth:{Cognito:{
   userPoolId: VITE_COGNITO_USER_POOL_ID, userPoolClientId: VITE_COGNITO_CLIENT_ID,
   loginWith:{email:true}}}})` at boot.
   - `src/lib/auth.ts` + `src/hooks/useAuth.tsx`: replace localStorage session with Amplify
     (`getCurrentUser`, `fetchAuthSession`, `signOut`). Current-user **profile/role** comes from
     a `GET /me` query (no more synchronous `getUserById`).
   - `src/routes/login.tsx`: email+password form using Amplify `signIn`. (v1 = login only;
     users are pre-created by the Cognito seed script. Self sign-up disabled; forgot-password
     optional.) Remove the seeded user-picker.
   - `src/routes/_auth.tsx` `beforeLoad`: make async — redirect to `/login` if no Amplify session.
   - `src/routes/index.tsx`: redirect by role from `/me`.
   - `src/components/layout/UserMenu.tsx`: logout → Amplify `signOut`; **remove** the dev
     `resetStore`/role-switcher (role is now authoritative from Cognito/profile; a client
     override can't bypass server authz).
4. **Components reading the store synchronously** must use query data instead:
   `src/routes/_auth/hr/records.tsx` and `employees.tsx` (and any other) import `getUserById`/
   `getAuditByRequest` from `#/store/*` — replace with a name-lookup map built from `useUsers()`
   and the `useAuditTrail()` query. (Grep `#/store/` across `src/` to find all call sites.)
5. **Delete** `src/store/*` (localStorage layer) and `src/lib/auth.ts`'s localStorage internals
   once the above compile against the API.

Phase-1 attachments stay metadata-only (kept inside the request JSON), unchanged from today —
real upload is Phase 2.

---

## Infrastructure (`infra/`, AWS CDK)

**`backend-stack.ts`:**
- DynamoDB: the 6 tables + GSIs above (`BillingMode.PAY_PER_REQUEST`, table definitions shared
  from `lib/tables.ts` so the local create-tables script and CDK agree).
- Cognito `UserPool` (sign-in alias = email, password policy) + `UserPoolClient`
  (auth flow `USER_PASSWORD_AUTH` / SRP, no secret for SPA). Optional groups employee/manager/hr.
- `HttpApi` (apigatewayv2) + `HttpUserPoolAuthorizer(userPool, client)` as default authorizer +
  `HttpLambdaIntegration` → `NodejsFunction` bundling `api/src/handler.ts`. CORS = CloudFront origin.
- Lambda IAM: DynamoDB Get/Put/Update/Delete/Query/Scan/BatchWrite/**TransactWrite** on the
  tables + their index ARNs. Env: table names, region (no `DYNAMODB_ENDPOINT` in prod),
  `COGNITO_USER_POOL_ID`.
- Outputs: `UserPoolId`, `ClientId`, `ApiUrl`.

**`web-stack.ts`:**
- S3 SPA bucket (private) + CloudFront `Distribution` using
  `origins.S3BucketOrigin.withOriginAccessControl(bucket)`; SPA fallback via `errorResponses`
  (403/404 → `/index.html`, status 200).
- `BucketDeployment` uploads `dist/client` and invalidates the distribution.
- Output: CloudFront URL.

**Deploy order (web build needs backend IDs):**
1. `cdk deploy BackendStack` → capture `UserPoolId`, `ClientId`, `ApiUrl`.
2. Write them into web build env (`.env.production` / CI vars: `VITE_API_URL`, `VITE_COGNITO_*`).
3. `vite build`.
4. `cdk deploy WebStack` (BucketDeployment ships `dist/client`).
Region default `us-east-1` (configurable); CloudFront default domain for v1 (custom domain later).

---

## Local development

- **`docker-compose.yml`**: `amazon/dynamodb-local` on `:8000` (optionally `dynamodb-admin` UI).
- **Tables locally**: `api/scripts/createTables.ts` (CreateTableCommand from the shared
  `lib/tables.ts` definitions) run against `http://localhost:8000`.
- **Seed**: `bun run api/scripts/seed.ts` writes the existing seed dataset (reuse
  `buildSeedStore()` data) via BatchWrite. `seedCognito.ts` AdminCreateUsers the 6 seed users
  with permanent passwords (local + a dev pool).
- **Local API**: `api/src/dev-server.ts` (`@hono/node-server`, port 3001) runs the same Hono app;
  `db.ts` reads `DYNAMODB_ENDPOINT=http://localhost:8000` with dummy creds.
- **Cognito locally**: there is no official local Cognito emulator → point Amplify at a **real
  dev Cognito user pool** (free tier). DynamoDB stays fully local in Docker. The local API
  verifies JWTs against the dev pool's JWKS (or trusts a dev header when `STAGE=local`).
- **Web**: `.env` = `VITE_API_URL=http://localhost:3001`, `VITE_COGNITO_USER_POOL_ID`,
  `VITE_COGNITO_CLIENT_ID`, `VITE_AWS_REGION`. `vite dev` on :3000.
- Env-var conventions per TanStack/Vite: client vars **must** be `VITE_`-prefixed; server-only
  vars (table names, endpoint) are unprefixed in `api/.env`.

---

## Phase 2 (additive, planned but not built in Phase 1)

- **S3 reports bucket + presigned URLs**: `POST /attachments/presign` → presigned PUT; client
  uploads the file directly to S3; store the S3 key on `Attachment` (replace `mockDataUrl`).
  Download via presigned GET. `AttachmentUpload.tsx` switches from metadata-only to real upload.
  Optional: server-generated report exports (CSV/PDF) written to the same bucket.
- **SES email**: verify a domain/sender; send templated email inside the Lambda mutations on key
  events (submitted→manager, approved/rejected→employee, cancellation flow). **Augments** the
  existing in-app `Notification` records, doesn't replace them. Lambda gains `ses:SendEmail`.
- **Cognito Admin user-creation**: HR "Add employee" UI → `POST /users` → Lambda
  `AdminCreateUser` + Put Users profile + seed that user's balances. Lambda gains
  `cognito-idp:AdminCreateUser`. (No create-employee UI exists today — net-new.)

---

## Verification

**Local (Phase 1):**
1. `docker compose up -d` → `bun run api/scripts/createTables.ts` → `bun run api/scripts/seed.ts`.
2. Create/seed dev-pool Cognito users (`seedCognito.ts`).
3. `bun --cwd api run dev` (API :3001) + `bun run dev` (web :3000).
4. Sign in with a seeded email+password; confirm `GET /me` resolves role and the dashboard loads.
5. Exercise the full flow: submit request (employee) → appears for manager → approve → balance
   `used` increments → notification shows → audit trail records it. Then request-cancellation →
   manager approves → balance restored. Verify against DynamoDB (dynamodb-admin) that
   request+audit+notification+balance all updated atomically.
6. HR: edit per-user entitlement (`employees_.$id`) → balance + `balance_adjusted` audit written.
7. `bun run test` (existing `src/logic` vitest suites stay green after the move to `shared/logic`).

**AWS (Phase 1):**
1. `cdk deploy BackendStack`; smoke-test API with a real Cognito token (`/me`, `/requests`).
2. Build web with stack outputs; `cdk deploy WebStack`.
3. Open the CloudFront URL, sign in, run the same end-to-end flow; confirm DynamoDB items in
   the AWS console and Lambda logs in CloudWatch.

---

## Key files to create / modify

- **New**: `shared/` (move types + logic), `api/**`, `infra/**`, `docker-compose.yml`,
  `src/lib/api.ts`, `src/lib/amplify.ts`.
- **Modify**: `src/queries/{requests,balances,directory,notifications}.ts` (call API, drop actor
  args), `src/hooks/useAuth.tsx`, `src/routes/login.tsx`, `src/routes/_auth.tsx`,
  `src/routes/index.tsx`, `src/components/layout/UserMenu.tsx`, `src/lib/queryClient.ts`,
  `src/routes/_auth/hr/records.tsx` + `employees.tsx` (and any other `#/store/*` consumers),
  `src/types/index.ts` (re-export from `shared`), `package.json` (workspace + scripts), remove
  `vercel.json` (replaced by CloudFront).
- **Delete**: `src/store/*` (after API cutover).
- **Reused unchanged**: `src/logic/*` (moved to `shared/logic`), all UI components and routes
  except the store/auth touchpoints above.
