import { clerkClient } from "@clerk/nextjs/server";
import { readFileSync } from "fs";

const envText = readFileSync(new URL("./.env.local", import.meta.url), "utf8");
for (const line of envText.split("\n")) {
  const [k, ...rest] = line.split("=");
  if (k && rest.length && !process.env[k]) process.env[k] = rest.join("=").trim();
}

async function main() {
  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({ limit: 1 });
  if (!users.length) { console.log("no users found"); return; }
  const id = users[0].id;

  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    await clerk.users.getUser(id);
    console.log(`clerk currentUser()-equivalent call ${i}: ${(performance.now() - t0).toFixed(1)}ms`);
  }
}
main().catch(err => console.error("ERR", err));
