-- Flip recruiter visibility to opt-out: default becomes true. One-time backfill of existing
-- students to visible=true — at the time of this migration no student has ever used the toggle
-- (all still at the false default), so this is a pure "apply the new default retroactively".
ALTER TABLE "User" ALTER COLUMN "visibleToRecruiters" SET DEFAULT true;

UPDATE "User" SET "visibleToRecruiters" = true WHERE "visibleToRecruitersAt" IS NULL;
