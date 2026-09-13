-- Phase A: backfill Session.createdById for rows that predate the column.
-- Idempotent — only touches rows where createdById is still null.
UPDATE "Session" s
SET "createdById" = d."userId"
FROM "Day" d
WHERE d.id = s."dayId" AND s."createdById" IS NULL;
