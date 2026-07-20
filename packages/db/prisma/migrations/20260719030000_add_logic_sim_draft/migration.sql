-- Digital Logic Simulator: one autosaved bench per user, same shape as CircuitDraft.
-- NOTE: applied to the dev database via `prisma db push` (see comment on the
-- 20260705161558_admin_platform_features migration for why `migrate dev` can't replay history
-- against the shadow database in this repo), then recorded here for migration history / deploys.

CREATE TABLE IF NOT EXISTS "LogicSimDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canvas" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LogicSimDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LogicSimDraft_userId_key" ON "LogicSimDraft"("userId");

DO $$ BEGIN
    ALTER TABLE "LogicSimDraft" ADD CONSTRAINT "LogicSimDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
