# CI/CD setup — one-time steps before these workflows can run

The 4 workflow files in `.github/workflows/` are written and committed, but **GitHub Actions
cannot run them successfully yet** — they reference GCP/Neon resources and secrets that don't
exist until you do the one-time setup below. Nothing here touches the running application;
this is all GitHub/GCP configuration.

## What each workflow does

| File | Trigger | Does |
|---|---|---|
| `ci.yml` | every PR + push to `main` | install → generate Prisma client → lint → typecheck → build. The pass/fail gate everything else depends on. |
| `preview.yml` | PR opened/updated | builds all 3 apps, deploys each as its own Cloud Run service (`web-pr-42`, etc.), pointed at a **fresh Neon branch** for that PR, comments the URLs on the PR. This is your "test on test" environment. |
| `preview-cleanup.yml` | PR closed | deletes the 3 preview services + the Neon branch, so closed PRs don't quietly keep costing money. |
| `deploy-prod.yml` | push to `main` (i.e. after merge) | builds prod images → **pauses for a required reviewer** (the `production` GitHub Environment) → on approval, deploys all 3 apps to production Cloud Run with their real min/max instance counts. |

## 1. One-time GCP setup

```bash
# Artifact Registry repo to hold your Docker images
gcloud artifacts repositories create studentos --repository-format=docker --location=asia-south1

# A dedicated deploy service account
gcloud iam service-accounts create studentos-deployer

# Grant it just what it needs (Cloud Run deploy + Artifact Registry push + Secret Manager read)
for role in roles/run.admin roles/artifactregistry.writer roles/secretmanager.secretAccessor roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:studentos-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done
```

## 2. Workload Identity Federation (GitHub → GCP auth, no JSON key file)

```bash
gcloud iam workload-identity-pools create github-pool --location=global

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='YOUR_GITHUB_ORG/YOUR_REPO'"

gcloud iam service-accounts add-iam-policy-binding \
  studentos-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_ORG/YOUR_REPO"
```

Take the two values these commands print (`workload_identity_provider` full resource name, and
the service account email) — they go into GitHub Secrets below.

## 3. GitHub repo configuration

**Secrets** (Settings → Secrets and variables → Actions → *Secrets*):

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | your GCP project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | full resource name from step 2 |
| `GCP_SERVICE_ACCOUNT` | `studentos-deployer@...iam.gserviceaccount.com` |
| `NEON_PROJECT_ID`, `NEON_API_KEY` | from Neon dashboard → Settings → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | same values as your `.env` — these get **baked into the image at build time** |

**Variables** (Settings → Secrets and variables → Actions → *Variables*, not secret, just config):
none required yet — everything above is treated as secret for simplicity.

**Environment** (Settings → Environments → New environment → name it `production`):
- Add yourself (or whoever owns deploys) under **Required reviewers**. This is what makes
  `deploy-prod.yml` stop and wait for a manual click before touching production — your
  "owner decides" gate.

**Branch protection** (Settings → Branches → add rule for `main`):
- Require a pull request before merging, require 1 approval.
- Require status checks to pass before merging → select the `ci` job.
- (Optional but recommended) Require branches to be up to date before merging.

## 4. Google Secret Manager — production runtime secrets

The actual **values** the app needs at runtime live here, not in GitHub. Create one secret per
row (`gcloud secrets create DATABASE_URL --data-file=-`, etc.) using your real production values:

`DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`AI_GATEWAY_API_KEY`, `RESEND_API_KEY`, `VAPI_PRIVATE_KEY`, `LIVEKIT_API_SECRET`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

`deploy-prod.yml` already references all of these via `--set-secrets`; Cloud Run pulls the live
value at container start, so rotating a secret in Secret Manager doesn't require a code change —
just a new revision (`gcloud run services update <app> --region ...` or the next deploy).

## 5. Where every env var actually lives — the full picture

| Kind | Lives in | Example |
|---|---|---|
| Runtime secret (server-only) | **Google Secret Manager**, injected by `--set-secrets` | `CLERK_SECRET_KEY`, `DATABASE_URL` |
| Build-time public var (`NEXT_PUBLIC_*`) | **GitHub Secrets**, passed as Docker `--build-arg` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| CI-only config (GCP project id, WIF provider) | **GitHub Secrets** | `GCP_PROJECT_ID` |
| Local dev values | `.env.local` (git-ignored), as today | unchanged |
| Preview/staging DB | a **Neon branch** created per-PR by `preview.yml`, deleted by `preview-cleanup.yml` | isolated, never touches prod data |

Rotating a `NEXT_PUBLIC_*` value requires a rebuild (documented already in
[[docker-containerization]]); rotating anything in Secret Manager only requires a new Cloud Run
revision, no rebuild.

## 6. The `run-migrations` Cloud Run Job

`deploy-prod.yml` runs this job (region `asia-southeast1`) before deploying `web` on every push
to `main`. It's a small standalone image — `packages/db/Dockerfile.migrate` — that runs
`prisma migrate deploy` in isolation from the pnpm workspace (no monorepo install needed, just
`prisma/schema.prisma` + `prisma/migrations` and a fresh `npm install prisma @prisma/client`).

**When `prisma/schema.prisma` or `prisma/migrations` changes**, rebuild and update the job:
```bash
cd packages/db
docker build --platform=linux/amd64 -f Dockerfile.migrate \
  -t asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/krackit/run-migrations:vN .
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/krackit/run-migrations:vN
gcloud run jobs update run-migrations \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/krackit/run-migrations:vN \
  --region=asia-southeast1
```
The workflow step is `continue-on-error: true` — a migration hiccup never blocks the actual app
deploy, but check the job's logs (Cloud Run → Jobs → run-migrations → Executions) after any
schema change to confirm it actually applied.

## 7. Third-party Actions used (verify versions before first run)

`neondatabase/create-branch-action`, `neondatabase/delete-branch-action`, and
`marocchino/sticky-pull-request-comment` are used for the preview-branch and PR-comment steps.
Pin/verify their versions against the Marketplace before the first real run — small deploy-repo
detail, not an architecture concern.
