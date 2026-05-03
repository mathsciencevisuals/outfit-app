ALTER TABLE "SavedLook"
ADD COLUMN IF NOT EXISTS "sourceScreen" TEXT,
ADD COLUMN IF NOT EXISTS "fitScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "stylistNote" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SavedLook_userId_tryOnImageUrl_idx"
ON "SavedLook" ("userId", "tryOnImageUrl");

CREATE INDEX IF NOT EXISTS "SavedLook_savedAt_idx"
ON "SavedLook" ("savedAt");

CREATE TABLE IF NOT EXISTS "AppEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppEvent_userId_eventName_createdAt_idx"
ON "AppEvent" ("userId", "eventName", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AppEvent_userId_fkey'
  ) THEN
    ALTER TABLE "AppEvent"
    ADD CONSTRAINT "AppEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
