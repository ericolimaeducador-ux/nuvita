# Nuvita Psi — Production execution guide (backend)

Step by step for the findings of `AUDITORIA-2026-08-08.md`. Each section says what is already **solved in the code** and
what still **depends on execution in the cloud**. The split matters, because no amount of code fixes a secret that does
not exist in GitHub.

It complements (does not replace) `PRODUCTION-CHECKLIST.md`, which has the inventory of secrets, DNS and domain. Here is
the execution order and the verification.

| Finding | What it is | State |
|---|---|---|
| C1 | CI secrets missing | ⏳ **You execute** — sections 1 and 2 |
| C2 | No global rate limiting | ✅ Code — section 6 |
| C3 | Dependency vulnerabilities | 🟡 Partial — section 9 |
| C4 | Redis outside the health check | ✅ Code — section 4 (+ HA in section 8) |
| M1 | Secrets without strength validation | ✅ Code — section 3 |
| M2 | IP extraction behind the LB | ⏳ **Measure on the 1st deploy** — section 7 |
| M3 | `autoIndex` on in production | ✅ Code — section 5 |
| M4 | No `enableShutdownHooks` | ✅ Code — section 5 |
| M5 | Login rate limiter fails open | ✅ By decision — alert in section 8 |
| M6 | Compromised Anthropic key | ⏳ **You execute** — section 2 |

---

## 1. CI secrets — the real blocker (C1)

100% of the deploys failed since 2026-08-07 because `gh secret list` is empty. The product exists only in local dev and
in the repository.

In **Settings > Secrets and variables > Actions** of the `nuvita-psi` repo:

| Secret | Value | Used by |
|---|---|---|
| `GCP_PROJECT_ID` | `nuvita-499800` | `deploy-api.yml` |
| `GCP_WIF_PROVIDER` | `projects/<num>/locations/global/workloadIdentityPools/<pool>/providers/<prov>` | `deploy-api.yml` |
| `GCP_SA_EMAIL` | deploy SA (see checklist item 2) | `deploy-api.yml` |
| `CLOUDRUN_ENV_YAML` | output of `node scripts/gen-cloudrun-env.cjs` | `deploy-api.yml` |
| `VITE_API_URL` | `https://api-psi.nuvita.app.br` | `deploy-pages.yml` |

The inventory of which secrets go into `cloudrun.env.yaml` is in `PRODUCTION-CHECKLIST.md`, item 1. **Generate nuvita-psi's
own secrets**; do not reuse the ones from the original Nuvita, even when sharing the GCP project.

### Before pasting `CLOUDRUN_ENV_YAML`, validate locally

Since section 3, a weak secret prevents the boot. Without a pre-check, this would only show up in the Cloud Run log, after
the image build and the deploy, which is exactly when you do not know whether the error is yours or the infrastructure's:

```bash
npm run build --workspace=apps/api     # the check validates against the compiled code
node scripts/gen-cloudrun-env.cjs
npm run check:cloudrun-env             # exit 0 = the API boots with this file
```

The script runs the **same `AppConfigService.initialize()`** that the API runs on boot; it does not reimplement the
validation rules. If it did, the two copies would diverge the first time someone changed one of them, and the script would
start lying exactly when you depend on it the most.

Verification:

```bash
gh secret list --repo ericolimaeducador-ux/nuvita-psi   # 5 lines
gh workflow run deploy-api.yml --repo ericolimaeducador-ux/nuvita-psi
gh run watch --repo ericolimaeducador-ux/nuvita-psi
```

---

## 2. Anthropic key rotation (M6)

> Corrected on 2026-10-25. The previous version said to register the key in Secret Manager. **That does not exist in
> production:** the API runs with `CONFIG_SOURCE=env` and `SECRETS_BACKEND=local-env`, and the Secret Manager API is not
> even enabled in the `nuvita-499800` project. The key reaches Cloud Run **only** through `CLOUDRUN_ENV_YAML` (a GitHub
> secret), which the `deploy-api.yml` workflow writes as `cloudrun.env.yaml` and applies with `--env-vars-file`.

How the key reaches production:

`apps/api/.env.production` (a local, gitignored file on the operator's machine) → `node scripts/gen-cloudrun-env.cjs`
→ `cloudrun.env.yaml` → pasted whole into the GitHub secret `CLOUDRUN_ENV_YAML` → `deploy-api.yml` →
`gcloud run deploy --env-vars-file`. The new value takes effect only on the NEXT deploy; updating the GitHub secret
alone changes nothing in the running revision.

**`--env-vars-file` replaces ALL environment variables of the revision.** A YAML with a missing line removes that
variable from production. Always paste the COMPLETE file, never a single line.

Rotation, in this order:

1. Generate the new key in the Anthropic console. Do NOT revoke the old one yet.
2. Put the new value in `apps/api/.env.production` (no spaces, no quotes at the ends; the value is 108 characters long and
   starts with `sk-ant-`).
3. Validate locally: `npm run build --workspace=apps/api`, `node scripts/gen-cloudrun-env.cjs`,
   `npm run check:cloudrun-env` (exit 0 = the API boots with that file).
4. Replace the GitHub secret `CLOUDRUN_ENV_YAML` with the whole generated file.
5. Run the deploy: `gh workflow run deploy-api.yml --repo ericolimaeducador-ux/nuvita-psi`, then check that the run is
   green and that the new revision serves 100% of the traffic.
6. Check the key on the new revision BY PROPERTIES, never by value: length, `sk-ant-` prefix, no spaces or quotes at the
   ends, and a fingerprint (first 8 hex of the SHA-256) different from the previous revision's. Also compare the number of
   environment variables with the previous revision (a lost line shows up here).
7. Exercise one real generation (`/ia-clinica/sugerir-abordagem`). A 401 `invalid x-api-key` in the Cloud Run log is the
   Anthropic API rejecting the key (HTTP 500 for the user); a missing/empty key is a 503.
8. Only then revoke the old key. If the old key shows calls you do not recognise in the console, that is an incident, not a
   rotation.

Why the rotation exists: the key in use was shared in a chat conversation (never committed; `apps/api/.env` is gitignored,
checked in the whole history). A key that passed through an untrusted channel is a compromised key.

Lesson (2026-10-25): a key revoked or rotated at the provider breaks the AI in production even though nothing changed in
Cloud Run (same fingerprint on revisions 00029 to 00045). Revoking before the new value is deployed takes the feature down.

The boot rejects the `.env.example` placeholder in production (section 3), but it has no way to know that a valid key
leaked or was revoked. This step is manual.

---

## 3. Fail-fast on weak secrets (M1) — ✅ implemented

`common/security/config-validation.ts`, called by `AppConfigService.validate()`. In `production`/`staging` the process
**does not boot** if:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PRONTUARIO_SIGNATURE_SECRET` or `BOOTSTRAP_SECRET` have fewer than 32
  characters;
- any secret has the literal value from `.env.example` (it was possible to boot with
  `change-me-access-secret-min-32-chars`: 36 characters, it passed any length test);
- `JWT_ACCESS_SECRET` equals `JWT_REFRESH_SECRET`.

Outside production nothing is validated; otherwise copying `.env.example` would stop working as the first step of whoever
clones the repo.

`ALLOW_PUBLIC_REGISTRATION=true` in production produces a **warning**, not an error: it only gets turned on with the
explicit variable, which means someone already decided; the value is the trace in the log.

Generating secrets: `openssl rand -base64 48` or
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

---

## 4. Redis in the health check (C4) — ✅ implemented

`modules/health/redis.health.ts`. `/health` now fails when Redis goes down.

Why it was critical: `AuthService.validateAccessToken` calls `TokenRevocationService.isRevoked` on **every authenticated
request**, and that service is fail-closed on purpose (when in doubt, deny). Redis down ⇒ the whole API is unusable for a
logged-in user, while `/health` answered 200 and Cloud Run kept traffic on an instance that served nobody.

The PING runs against a 2 s timeout: a health check that hangs is as bad as a health check that lies.

Configure the probe to act on it (without this the check only decorates the log):

```bash
gcloud run services update nuvita-psi-api \
  --project nuvita-499800 --region southamerica-east1 \
  --liveness-probe httpGet.path=/health,initialDelaySeconds=15,periodSeconds=30,failureThreshold=3
```

Verification: bring local Redis down and confirm `/health` answers 503:

```bash
docker compose stop redis && curl -i localhost:3000/health   # 503 + "redis":"down"
docker compose start redis && curl -i localhost:3000/health   # 200
```

---

## 5. Instance lifecycle (M3, M4) — ✅ implemented

**`autoIndex` off outside dev** (`app.module.ts`). Mongoose's default is `true`, including in production: every boot tried
to build all schema indexes. Harmless with today's collections; with large `pacientes`/`prontuarios` it blows the Cloud Run
startup timeout and takes the deploy down.

⚠️ **Operational consequence:** a new index no longer appears by itself in production. When you add an index to a schema,
create it explicitly:

```js
db.pacientes.createIndex({ campoNovo: 1 }, { background: true })
```

**Graceful shutdown** (`main.ts` + `AuthModule.onApplicationShutdown`). Cloud Run sends SIGTERM and waits ~10 s before
SIGKILL. Without the hooks, in-flight requests were cut in the middle and connections did not close cleanly: a client
error on every deploy/scale-down and orphan connections piling up on Atlas.

`redisProvider` is a `useFactory` that returns a raw `new Redis(...)`, and a factory provider has no lifecycle of its own in
Nest: the `quit()` had to be hung on the module by hand. **If another external resource ever comes in through
`useFactory`, it needs the same treatment**; it is not automatic.

---

## 6. Global rate limiting (C2) — ✅ implemented

Before: `ThrottlerModule.forRoot()` registered, but **without an `APP_GUARD`**. The limit only applied in two controllers
that declared the guard by hand. Everything else ran without a limit, including `telemedicina/acesso`, public and
unauthenticated.

Now `GlobalThrottlerGuard` (`common/http/global-throttler.guard.ts`) is the `APP_GUARD`. Default ceiling **300 req/min per
IP**; sensitive routes tighten it:

| Route | Limit/min | Why |
|---|---|---|
| `POST /auth/register` | 5 | anti brute-force |
| `POST /auth/login` | 10 | anti brute-force of password/TOTP |
| `POST /ia-clinica/*` | 10 | paid call to an external provider |
| `GET /telemedicina/acesso/:token` | 20 | once per link open |
| `POST .../entrar` | 20 | once per session + re-entries |
| `POST .../sinais` | 120 | burst of WebRTC signalling |
| `GET .../sinais` | 150 | **polling**: `SalaVideo.tsx` every 1200 ms = 50/min per participant; 3x margin |
| `POST .../eventos` | 30 | few per appointment |
| `GET /health` | — | `@SkipThrottle`: a 429 on the probe = a killed instance |

The tracker is `extractClientIp` (last `X-Forwarded-For` entry) and not the raw `req.ip`; see section 7.

The 300/min default is deliberately high: the limit is **per IP**, and a whole clinic behind a shared NAT shares the bucket.
Tightening it without first resolving section 7 locks out legitimate users.

⚠️ **Known limitation:** the `@nestjs/throttler` storage is in memory, so the limit applies **per Cloud Run instance**; with
N instances the effective ceiling is N × limit. This protects the CPU of each instance (which is the polling risk), but it
is not a global limit. For a global limit, plug storage into Redis (`@nest-lab/throttler-storage-redis`). It was not done
because it adds a dependency and couples throttling to Redis availability, which deserves an explicit decision.

### Note on the threat model of `telemedicina/acesso`

The tokens are UUIDv4 (122 bits of entropy): enumeration by brute force is infeasible. The risk on these routes is
**resource abuse** (CPU, Cloud Run cost, unbounded growth of the signal/event collections), not improper access to the
room. The limits above are sized for that.

---

## 7. Verify the IP extraction on the first deploy (M2) — ⏳ pending

`common/http/client-ip.ts` uses the **last** `X-Forwarded-For` entry, with the correct argument that the first one is
controlled by the client.

Behind a **GCP Application Load Balancer** the format is `<client-ip>, <forwarding-rule-ip>`: the last entry is the
balancer, **constant for all users**. If that is the case, all rate limiting (now global, hence the whole API) shares a
single bucket: it either locks everybody out or locks nobody.

This **depends on the real topology** and cannot be determined without measuring. Cloud Run directly and Cloud Run behind
an LB behave differently.

**How to measure**, right after the first deploy:

```bash
gcloud logging read \
  'resource.labels.service_name="nuvita-psi-api" AND httpRequest.requestUrl:"/auth/login"' \
  --project nuvita-499800 --limit 20 \
  --format='value(httpRequest.remoteIp, jsonPayload.ip)'
```

Access from two different networks (e.g. home and phone 4G) and compare:

- **Different IPs** ⇒ correct, nothing to do.
- **Identical IP** ⇒ it is the balancer. Fix it by replacing the heuristic with "n-th entry from the end", with N = number of
  trusted proxies, or start trusting the `X-Envoy-External-Address` header that Cloud Run populates. **Do not** go back to
  the first entry: it can be forged by the client.

Until this is measured, treat the limits of section 6 as unverified.

---

## 8. Redis HA and alerts (C4, M5)

Redis is a single point of failure of authentication. Section 4 made the health check tell the truth, but did not remove
the dependency.

**Memorystore with a replica:**

```bash
gcloud redis instances create nuvita-psi-cache \
  --project nuvita-499800 --region southamerica-east1 \
  --tier standard --size 1 --redis-version redis_7_0 \
  --replica-count 1 --read-replicas-mode READ_REPLICAS_ENABLED
```

`--tier standard` is what gives automatic failover; `basic` is a single instance and solves nothing here.

**Alerts** (Cloud Monitoring):

1. **`/health` at 503**: an uptime check on the endpoint. It is the signal that Mongo or Redis went down; it only became
   reliable after section 4.
2. **Log of the fail-open login rate limiter**: `LoginRateLimiterService` catches the Redis failure and **keeps going**
   (`login-rate-limiter.service.ts:23`), with a warning log. It is a deliberate and documented tradeoff (availability over
   protection), but it means that a Redis outage silently removes the protection against brute force of password and TOTP.
   Alert on that specific log:

   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="nuvita-psi-api"
   severity="WARNING"
   textPayload:"rate limiter"
   ```

   **Do not change the behaviour to fail-closed without a product decision**: it would turn a Redis outage into "nobody can
   log in".

---

## 9. Vulnerability gate in CI (C3) — 🟡 partial

**Done:** `ci.yml` runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` because what matters is what goes into
the container, not the build tooling.

**Resolved in this round** (33 → 28 vulnerabilities, **1 critical → 0**):

- `bcrypt` 5.1.1 → **6.0.0**: version 6 dropped `@mapbox/node-pre-gyp` (and with it `tar`, the origin of the only critical)
  in favour of `node-gyp-build`. The API is identical and the hash format is still `$2b$`, so **existing passwords keep
  validating**; verified, not assumed.
- `sharp` 0.33.5 → **0.35.3**: fixes CVEs inherited from libvips. It is worth more than the others because `sharp`
  processes **user-uploaded documents** (`s3-document-storage.service.ts:81`), that is, it is real attack surface.
- `postcss` → 8.5.26 and overrides of `brace-expansion` / `nanoid` in the root `package.json`.

**5 highs remain, all stuck on the Nest 10 → 11 migration:**

| Package | Comes through | Nature |
|---|---|---|
| `multer` | `@nestjs/platform-express` | DoS on upload |
| `js-yaml`, `lodash` | `@nestjs/swagger` | prototype pollution / DoS |
| `postcss` (nested) | `@tailwindcss/postcss` | build-time only |

The gate stayed at `critical` and not `high` on purpose: with 5 highs without an available fix, `high` would leave CI
**permanently red**, and a gate that is always red is a gate everybody learns to ignore.

**Tighten it to `--audit-level=high` in the same PR as the Nest 11 migration.** That migration is work of its own
(breaking changes across the whole `@nestjs/*` stack); it did not fit inside a hardening cycle.

Meanwhile, `multer` deserves specific attention: the CVEs are DoS through a malformed upload, and the documents endpoint
accepts a file from an authenticated user. The rate limiting of section 6 reduces the exposure, but does not eliminate it.

---

## Execution order

1. **Section 1**: without the secrets, nothing goes live.
2. **Section 2**: rotate the Anthropic key before the service comes up.
3. **Section 4 (probe) and 8 (Memorystore HA)**: before a real user touches the system.
4. **Section 7**: measure on the first deploy, with real traffic; without it the limits of section 6 are theory.
5. **Section 9**: the Nest 11 migration in a cycle of its own.

Sections 3, 5 and 6 are already in the code and ship with the next deploy.
