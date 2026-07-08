#!/usr/bin/env node
/**
 * One-shot Piston runtime provisioning for production.
 *
 * A fresh `piston_data` volume ships with zero language runtimes installed. Without this,
 * code execution/grading fails closed as "unverified" with no obvious cause. `scripts/dev.mjs`
 * does the equivalent for local dev; this is the same install logic, standalone, so it can run
 * as a one-shot service in docker-compose.prod.yml (see the `piston-runtimes` service).
 *
 * Usage: PISTON_URL=http://piston:2000/api/v2 node scripts/provision-piston.mjs
 */
const PISTON_BASE = process.env.PISTON_URL || "http://localhost:2000/api/v2";
// Must match the language set the app actually runs (apps/web DSA/code grading).
const RUNTIMES = ["python", "node", "typescript", "java", "gcc"];

const log = (m) => console.log(`[provision-piston] ${m}`);
const warn = (m) => console.warn(`[provision-piston] warn: ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOk(url, opts) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(4000), ...opts });
  } catch {
    return null;
  }
}

async function waitForPiston(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetchOk(`${PISTON_BASE}/runtimes`);
    if (res && res.ok) return true;
    await sleep(2000);
  }
  return false;
}

async function main() {
  log(`Waiting for Piston at ${PISTON_BASE}…`);
  if (!(await waitForPiston())) {
    console.error(`[provision-piston] Piston never became reachable at ${PISTON_BASE}`);
    process.exit(1);
  }

  const pkgRes = await fetchOk(`${PISTON_BASE}/packages`);
  const packages = pkgRes ? await pkgRes.json().catch(() => []) : [];
  if (!Array.isArray(packages) || packages.length === 0) {
    console.error("[provision-piston] Could not read Piston packages list — aborting.");
    process.exit(1);
  }

  const need = [];
  for (const lang of RUNTIMES) {
    const candidates = packages.filter((p) => p.language === lang);
    if (candidates.length === 0) {
      warn(`Piston has no package for '${lang}' — skipping.`);
      continue;
    }
    if (candidates.some((p) => p.installed)) continue;
    candidates.sort((a, b) =>
      b.language_version.localeCompare(a.language_version, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    need.push({ lang, version: candidates[0].language_version });
  }

  if (need.length === 0) {
    log(`Runtimes already installed (${RUNTIMES.join(", ")}). Nothing to do.`);
    return;
  }

  log(`Installing ${need.map((n) => `${n.lang}@${n.version}`).join(", ")}…`);
  let failed = false;
  for (const { lang, version } of need) {
    log(`  installing ${lang}@${version}…`);
    const res = await fetchOk(`${PISTON_BASE}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, version }),
      signal: AbortSignal.timeout(300000),
    });
    if (res && res.ok) {
      log(`  installed ${lang}@${version}`);
    } else {
      failed = true;
      warn(`  failed to install ${lang}@${version} — code grading for it stays 'unverified'.`);
    }
  }
  if (failed) process.exit(1);
  log("Done.");
}

main().catch((e) => {
  console.error(`[provision-piston] fatal: ${e.message}`);
  process.exit(1);
});
