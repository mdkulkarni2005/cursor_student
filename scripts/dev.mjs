#!/usr/bin/env node
/**
 * One-command dev for StudentOS.
 *
 *   pnpm run dev
 *
 * Brings up the local background services (Gotenberg + Piston via docker compose),
 * provisions Piston language runtimes (once), then launches the app (`turbo dev`).
 *
 * Design rules (so this never breaks a previously-working `dev`):
 *   - Service bring-up is BEST-EFFORT. Any failure (no Docker daemon, slow pull,
 *     Piston broken on this OS) only logs a warning — the app still starts.
 *   - The app is NEVER blocked on Piston runtime installs; they run in the
 *     background while Next boots. The execution layer fails closed, so until a
 *     runtime is ready, code grading is "unverified" — never a fabricated pass.
 *   - Escape hatch: `pnpm run dev:app` runs the raw app with no services.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_LOCAL = join(ROOT, "apps", "web", ".env.local");
const ENV_DEV_LOCAL = join(ROOT, "apps", "web", ".env.development.local");
const GOTENBERG_URL = "http://localhost:9000";
const PISTON_BASE = "http://localhost:2000/api/v2";
// Piston package languages the app runs: python, node (javascript), typescript, java, c++ (gcc).
const RUNTIMES = ["python", "node", "typescript", "java", "gcc"];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
const log = (m) => console.log(`${c.dim("[dev]")} ${m}`);
const warn = (m) => console.log(`${c.dim("[dev]")} ${c.yellow("warn")} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function dockerUp() {
  const v = sh("docker", ["version", "--format", "{{.Server.Version}}"]);
  if (v.status !== 0) {
    warn("Docker daemon not reachable — skipping background services.");
    warn(`Start Docker Desktop, then re-run, or use ${c.bold("pnpm run dev:app")}.`);
    return false;
  }
  return true;
}

function composeUp() {
  log("Starting background services (Gotenberg + Piston)…");
  const r = sh("docker", ["compose", "up", "-d"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) {
    warn("`docker compose up -d` failed — the app will run without local services.");
    return false;
  }
  return true;
}

async function fetchOk(url, opts) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), ...opts });
    return res;
  } catch {
    return null;
  }
}

async function waitFor(label, url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetchOk(url);
    if (res && res.ok) {
      log(`${c.green("ready")} ${label}`);
      return true;
    }
    await sleep(1500);
  }
  warn(`${label} not ready after ${Math.round(timeoutMs / 1000)}s — continuing anyway.`);
  return false;
}

/** Ensure PISTON_URL is set in one of apps/web's local env files so `next dev` picks it up. */
function ensurePistonEnv() {
  // next dev loads both; either one is enough. Don't write a duplicate if it's already set.
  for (const f of [ENV_DEV_LOCAL, ENV_LOCAL]) {
    if (existsSync(f) && /^\s*PISTON_URL\s*=/m.test(readFileSync(f, "utf8"))) return;
  }
  if (!existsSync(ENV_LOCAL)) return; // no env file to append to
  const line = `\n# Code execution sandbox — local Piston (added by scripts/dev.mjs)\nPISTON_URL="${PISTON_BASE}"\n`;
  appendFileSync(ENV_LOCAL, line);
  log(`Wired ${c.bold("PISTON_URL")} into apps/web/.env.local`);
}

/** Install Piston language runtimes in the background. Idempotent + best-effort. */
async function provisionPiston() {
  // Wait for the Piston API itself.
  const ok = await waitFor("piston api", `${PISTON_BASE}/runtimes`, 60000);
  if (!ok) return;

  // /packages lists every available {language, language_version, installed}. Use the
  // `installed` flag directly — it's the source of truth and avoids guessing runtime names.
  const pkgRes = await fetchOk(`${PISTON_BASE}/packages`);
  const packages = pkgRes ? await pkgRes.json().catch(() => []) : [];
  if (!Array.isArray(packages) || packages.length === 0) {
    warn("Could not read Piston packages — skipping runtime setup.");
    return;
  }

  const need = []; // { lang, version }
  for (const lang of RUNTIMES) {
    const candidates = packages.filter((p) => p.language === lang);
    if (candidates.length === 0) {
      warn(`Piston has no package for '${lang}' — skipping.`);
      continue;
    }
    if (candidates.some((p) => p.installed)) continue; // already installed
    // Highest language_version (numeric-aware sort).
    candidates.sort((a, b) =>
      b.language_version.localeCompare(a.language_version, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    need.push({ lang, version: candidates[0].language_version });
  }

  if (need.length === 0) {
    log(`${c.green("ok")} Piston runtimes already installed (${RUNTIMES.join(", ")})`);
    return;
  }

  log(
    c.bold(
      `One-time Piston setup: installing ${need
        .map((n) => `${n.lang}@${n.version}`)
        .join(", ")} (downloads, may take a few min)…`
    )
  );
  for (const { lang, version } of need) {
    log(`  installing ${lang}@${version}…`);
    const res = await fetchOk(`${PISTON_BASE}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, version }),
      signal: AbortSignal.timeout(300000), // installs can be slow
    });
    if (res && res.ok) log(`  ${c.green("installed")} ${lang}@${version}`);
    else warn(`  failed to install ${lang}@${version} — code grading for it stays 'unverified'.`);
  }
  log(c.green("Piston runtime setup done."));
}

async function main() {
  log(c.bold("StudentOS dev — bringing up services + app"));

  if (dockerUp() && composeUp()) {
    ensurePistonEnv();
    // Gotenberg readiness is quick; don't hard-block on it.
    await waitFor("gotenberg", `${GOTENBERG_URL}/health`, 30000);
    // Piston runtime install runs in the BACKGROUND — app must not wait on it.
    provisionPiston().catch((e) => warn(`Piston provisioning error: ${e.message}`));
  }

  log("Launching app (turbo dev)…");
  // Unfiltered — runs every workspace's `dev` script, including admin (port 3100).
  const app = spawn("pnpm", ["exec", "turbo", "dev"], { cwd: ROOT, stdio: "inherit" });

  const forward = (sig) => () => {
    if (!app.killed) app.kill(sig);
  };
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  app.on("exit", (code) => {
    log(c.dim("app exited — background services left running (stop with: pnpm run dev:down)"));
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(c.red(`[dev] fatal: ${e.message}`));
  process.exit(1);
});
