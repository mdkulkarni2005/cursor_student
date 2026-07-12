# Production Setup Guide — turning the diagram into real infrastructure

**Scope of this document:** everything needed to stand up the actual cloud resources —
domain, Cloudflare, Redis, the Worker VM, Cloud Run services, secrets, monitoring. Click-by-click,
in order.

**Not in this document:** the CI/CD pipeline itself (GitHub Actions building/deploying your code).
That's a separate, narrower concern — see [`CICD_SETUP.md`](./CICD_SETUP.md) — and you do it
*after* everything below exists, since the pipeline deploys *into* the resources this guide creates.

Order matters below. Do the sections top to bottom the first time.

---

## 0. Accounts you need before starting

| Service | Sign up at | Why |
|---|---|---|
| Google Cloud | https://console.cloud.google.com | Compute, Cloud Run, Secret Manager, Artifact Registry |
| Cloudflare | https://dash.cloudflare.com/sign-up | DNS, WAF, DDoS, free SSL |
| Upstash | https://console.upstash.com | Redis (rate limiter) |
| Neon | https://console.neon.tech | You already have this — Postgres |
| GitHub | you already have this | Code + CI/CD |

Have your domain (e.g. `studentos.app`) purchased and ready to point at Cloudflare.

---

## 1. Google Cloud project

1. Go to **https://console.cloud.google.com/projectcreate**
2. Project name: `studentos-prod` (or similar). Note the auto-generated **Project ID** — you'll
   paste this into GitHub secrets and every `gcloud` command below.
3. Left sidebar → **Billing** → link a billing account (this is where your $300 credit lives —
   confirm it's attached under **Billing → My Projects**).
4. Enable the APIs you'll need. Go to **APIs & Services → Enabled APIs & Services → + Enable APIs
   and Services**, search and enable each of:
   - Cloud Run Admin API
   - Artifact Registry API
   - Secret Manager API
   - Compute Engine API
   - Serverless VPC Access API
   - Cloud NAT (part of Compute Engine, no separate toggle)
   - Cloud Monitoring / Cloud Logging API (usually on by default)

   Or via CLI (install `gcloud` first: https://cloud.google.com/sdk/docs/install):
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
     secretmanager.googleapis.com compute.googleapis.com vpcaccess.googleapis.com
   ```
5. Pick your region once and reuse it everywhere below: **`asia-south1`** (Mumbai) — closest to
   your users, matches the diagrams.

---

## 2. Cloudflare — domain, DNS, WAF, SSL

1. **https://dash.cloudflare.com** → **Add a Site** → enter your domain (`studentos.app`).
2. Pick the **Free plan**.
3. Cloudflare scans existing DNS records, then shows you **2 nameservers** (e.g.
   `ns1.cloudflare.com`, `ns2.cloudflare.com`). Go to wherever you *bought* the domain (GoDaddy,
   Namecheap, Google Domains, etc.) → **DNS / Nameserver settings** → replace the existing
   nameservers with Cloudflare's two. This is the one step outside Cloudflare/GCP entirely — do it
   at your registrar.
4. Wait for Cloudflare to show **"Active"** on the site overview (can take a few minutes to a few
   hours for nameserver propagation).
5. **DNS records — SKIP this for now and come back after section 10.** You can't fill in a
   correct Target yet: it only exists once your Cloud Run services (section 8) and the domain
   mapping (section 10) are created. Trying to guess it here is exactly what trips people up.
   When you reach section 10, Google will show you the real value (it's almost always
   `ghs.googlehosted.com`), and you'll come back here and add:
   | Type | Name | Target | Proxy |
   |---|---|---|---|
   | CNAME | `app` | `ghs.googlehosted.com` (confirm against what section 10 actually shows you) | Proxied |
   | CNAME | `recruiter` | same | Proxied |
   | CNAME | `admin` | same | Proxied |
6. **SSL/TLS** (left sidebar → **SSL/TLS → Overview**): set mode to **Full (strict)**.
7. **WAF** (left sidebar → **Security → WAF**): under **Managed rules**, turn on the
   **Cloudflare Managed Ruleset** (free tier includes a usable default set).
8. **Rate limiting** (left sidebar → **Security → WAF → Rate limiting rules → Create rule**):
   add a simple rule, e.g. "if requests from one IP > 300 in 1 minute to `/*` → Block for 10
   minutes." This is your Layer-1 protection (coarse, per-IP) sitting in front of your app's own
   per-user Redis limiter (Layer-2).
9. **DDoS**: nothing to configure — it's automatic on every plan including Free.

---

## 3. Upstash Redis (the shared rate-limiter store)

1. **https://console.upstash.com** → **Create Database**.
2. Name: `studentos-prod`. Type: **Regional** (not Global — you don't need multi-region for a
   rate limiter). Region: pick the one closest to `asia-south1` (Upstash lists available regions;
   choose an Asia-Pacific one, e.g. `ap-south-1`, to keep latency low from your Cloud Run services).
3. After creation, open the database → **REST API** section → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. These two values go into **Google Secret Manager** (section 7 below) — never into the
   Dockerfile or committed `.env` files.
5. Nothing else to configure. Your code already uses these two exact variable names
   (`apps/web/lib/reliability.ts`) — once they're set in production, the rate limiter
   automatically stops using its in-memory fallback.

---

## 4. Neon — confirm you're using the pooled connection

You already have Neon set up. Just confirm, in **https://console.neon.tech** → your project →
**Connection Details**:
1. Toggle **"Pooled connection"** ON — copy that string as `DATABASE_URL`.
2. Toggle it OFF — copy that string as `DIRECT_URL` (used only for migrations).
3. Both go into Secret Manager (section 7). The app already appends a safe connection cap
   (`connection_limit=3`, see `packages/db/src/index.ts`) — you don't need to add anything to the
   URL yourself.
4. (Optional hardening) **Settings → IP Allow** — if you set up the VPC connector + Cloud NAT in
   section 6, you'll get one static outbound IP; you can allow-list just that IP here. Skipping
   this is fine at launch (TLS + credentials already protect the connection).

---

## 5. Artifact Registry (where your Docker images live)

```bash
gcloud artifacts repositories create studentos \
  --repository-format=docker \
  --location=asia-south1 \
  --description="StudentOS app images"
```
Or via console: **https://console.cloud.google.com/artifacts** → **Create Repository** → format
`Docker`, region `asia-south1`, name `studentos`.

---

## 6. Worker VM (Piston only — Gotenberg moved to Cloud Run in section 8)

1. **https://console.cloud.google.com/compute/instances** → **Create Instance**.
2. Name: `studentos-worker`. Region: `asia-south1`, any zone.
3. **Machine configuration**: series `E2`, machine type **`e2-small`** (2 vCPU shared, 2GB RAM —
   Piston's per-run limits keep any single execution light; this is enough headroom to start).
4. **Boot disk**: click **Change** → OS `Ubuntu 22.04 LTS` → size `30 GB` (Piston's language
   runtimes take real disk space) → Standard persistent disk is fine.
5. **Firewall**: leave "Allow HTTP/HTTPS" UNCHECKED — this VM should never be reached from the
   public internet directly (matches the diagram: private VPC only).
6. **Networking** tab → confirm it's on the `default` VPC network for now (you'll add the
   Serverless VPC Connector in section 9 so Cloud Run can privately reach it).
7. Click **Create**.
8. SSH in via the **SSH** button in the console (uses Identity-Aware Proxy automatically — no
   key management needed), then install Docker and run Piston:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo docker run -d --name piston --privileged -p 2000:2000 \
     -v piston_data:/piston --restart unless-stopped ghcr.io/engineer-man/piston:latest
   ```
9. Provision the language runtimes (one-time, using your existing
   `scripts/provision-piston.mjs`):
   ```bash
   # from your local machine — copy the script to the VM
   gcloud compute scp scripts/provision-piston.mjs studentos-worker:~ --zone=YOUR_ZONE

   # then, over the SSH session opened in step 8
   PISTON_URL=http://localhost:2000/api/v2 node provision-piston.mjs
   ```
10. Confirm it's listening: `curl http://localhost:2000/api/v2/runtimes` should return a JSON list.

---

## 7. Secret Manager — every production secret in one place

Console: **https://console.cloud.google.com/security/secret-manager** → **Create Secret** for
each row (name must match exactly — the CI/CD deploy workflow references these names):

| Secret name | Value comes from |
|---|---|
| `DATABASE_URL` | Neon pooled string (section 4) |
| `DIRECT_URL` | Neon direct string (section 4) |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare dashboard → R2 → Manage API tokens |
| `AI_GATEWAY_API_KEY` | Vercel dashboard → AI Gateway |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `VAPI_PRIVATE_KEY` | Vapi dashboard → API Keys |
| `LIVEKIT_API_SECRET` | LiveKit Cloud dashboard |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | section 3 above |
| `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard → API Keys / Webhooks |

Or via CLI, one example (repeat per secret):
```bash
echo -n "your-value-here" | gcloud secrets create DATABASE_URL --data-file=-
```

These are **runtime secrets** — Cloud Run reads them at container start via `--set-secrets`
(already wired into `deploy-prod.yml`). They are never baked into an image and never live in
GitHub.

---

## 8. Cloud Run services — web, admin, recruiter, gotenberg

You can create these once by hand (console, below) to confirm everything works end-to-end, then
let `deploy-prod.yml` take over for every future deploy.

For each of **web**, **admin**, **recruiter**, **gotenberg**:

1. **https://console.cloud.google.com/run** → **Create Service**.
2. **Deploy one revision from an existing container image** — for the first manual deploy,
   build and push locally:
   ```bash
   gcloud auth configure-docker asia-south1-docker.pkg.dev
   docker build -f apps/web/Dockerfile \
     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
     --build-arg NEXT_PUBLIC_APP_URL=https://app.studentos.app \
     --build-arg NEXT_PUBLIC_RECRUITER_APP_URL=https://recruiter.studentos.app \
     -t asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/studentos/web:v1 .
   docker push asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/studentos/web:v1
   ```
   (Gotenberg doesn't need a custom build — use the public image directly:
   `gotenberg/gotenberg:8`.)
3. Service name: `web` (or `admin` / `recruiter` / `gotenberg`).
4. Region: `asia-south1`.
5. **Authentication**: "Allow unauthenticated invocations" (public web apps) — **except**
   `gotenberg`, which should be **internal only** (only reachable from other Cloud Run
   services/VPC, not the public internet): choose "Require authentication" +
   set **Ingress = Internal**.
6. **Container port**: leave default — do NOT try to force 3000/3100/3200; Cloud Run injects its
   own `$PORT` and the Next.js standalone server already reads it at runtime, so it just works.
7. **Capacity**: per the diagram —
   | Service | Min instances | Max instances | Memory |
   |---|---|---|---|
   | web | 1 | 10 | 1 GiB |
   | recruiter | 0 | 3 | 512 MiB |
   | admin | 0 | 1 | 512 MiB |
   | gotenberg | 0 | 3 | 1 GiB |
8. **Request timeout** (under "Container, Networking, Security" → scroll to **Request timeout**):
   set **900 seconds** (15 min) — this is the Flaw-3 stopgap for long AI generations.
9. **Variables & Secrets** tab → **Reference a secret** → add every row from section 7 as an
   environment variable pointing at that secret's `latest` version.
10. **Networking** tab → once you've done section 9 (VPC connector), select it here for `web`,
    `admin`, `recruiter` (so they can privately reach the Worker VM and, optionally, use a static
    NAT IP toward Neon).
11. Click **Create/Deploy**. Wait for the green checkmark, then copy the assigned
    `*.run.app` URL.

---

## 9. Serverless VPC Connector + Cloud NAT (private networking — the fiddly part)

This is what lets Cloud Run reach your private Worker VM, and (optionally) gives your outbound
traffic a fixed IP for Neon allow-listing.

```bash
# 1. A connector Cloud Run services attach to
gcloud compute networks vpc-access connectors create studentos-connector \
  --region=asia-south1 --network=default --range=10.8.0.0/28

# 2. A static external IP for outbound NAT
gcloud compute addresses create studentos-nat-ip --region=asia-south1

# 3. A Cloud Router + NAT gateway using that static IP
gcloud compute routers create studentos-router --network=default --region=asia-south1
gcloud compute routers nats create studentos-nat \
  --router=studentos-router --region=asia-south1 \
  --nat-external-ip-pool=studentos-nat-ip \
  --nat-all-subnet-ip-ranges
```

Then, in each Cloud Run service (section 8, step 10), set **Networking → VPC connector** =
`studentos-connector`, and route "All traffic" through it if you want the fixed NAT IP to apply
to calls toward Neon too (otherwise "Route only private ranges" is enough just to reach the
Worker VM).

**Firewall rule** so Cloud Run can actually reach Piston on the Worker VM:
```bash
gcloud compute firewall-rules create allow-piston-from-vpc-connector \
  --network=default --direction=INGRESS --action=ALLOW \
  --rules=tcp:2000 --source-ranges=10.8.0.0/28
```

Point your apps at Piston via its **internal IP** (VM details page → "Internal IP"), e.g.
`PISTON_URL=http://10.x.x.x:2000/api/v2` — set this as another Secret Manager entry or a plain
Cloud Run environment variable (it's not sensitive).

---

## 10. Domain mapping — connect Cloud Run to your Cloudflare DNS

1. **https://console.cloud.google.com/run/domains** → **Add Mapping**.
2. Select service `web` → domain `app.studentos.app`. Repeat for `recruiter` → `recruiter.studentos.app`,
   `admin` → `admin.studentos.app`.
3. Google shows you the exact DNS record (usually a `CNAME` to `ghs.googlehosted.com`) — **now
   go back to section 2, step 5** and add the 3 CNAME records in Cloudflare using that value.
4. Wait for the mapping status to turn green ("Certificate provisioned").

---

## 11. Monitoring & budget alerts

1. **https://console.cloud.google.com/billing/budgets** → **Create Budget**.
2. Scope: your project. Amount: **$300** (your credit).
3. Alert thresholds: **50%, 75%, 90%, 100%** → email notifications to yourself.
4. **https://console.cloud.google.com/monitoring/uptime** → **Create Uptime Check** for each
   public URL (`app.`, `recruiter.`, `admin.`) — HTTPS, every 5 minutes, alert if down for 2
   consecutive checks.

---

## 12. Final checklist before you call it "live"

- [ ] All 3 subdomains resolve and show the app (not a Cloudflare error page).
- [ ] Sign in works on `app.` (Clerk).
- [ ] Generate one report/PPT end-to-end (exercises Neon + AI Gateway + R2 + Gotenberg).
- [ ] Run one DSA problem (exercises Piston over the private VPC path).
- [ ] Hit a rate-limited action >N times quickly — confirm you get the friendly "going a bit fast"
      message (proves Redis is actually wired, not silently falling back to in-memory).
- [ ] Trigger a test Razorpay webhook (or a ₹1 test payment) — confirm it updates the plan in Neon.
- [ ] Budget alert email arrives when you manually push spend past 50% (or just trust the
      threshold — no need to force this one).
- [ ] Uptime checks all green.

Once this checklist passes, follow [`CICD_SETUP.md`](./CICD_SETUP.md) so future changes ship
through PR → preview → review → production instead of manual `docker push` + console deploys.
