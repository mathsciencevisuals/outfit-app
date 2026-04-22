ALTER TABLE "Profile"
ADD COLUMN IF NOT EXISTS "avatarUploadId" TEXT,
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "budgetMin" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "budgetMax" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "budgetLabel" TEXT,
ADD COLUMN IF NOT EXISTS "closetStatus" TEXT NOT NULL DEFAULT 'COMING_SOON';

ALTER TABLE "SavedLook"
ADD COLUMN IF NOT EXISTS "isWishlist" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "TryOnRequest"
ADD COLUMN IF NOT EXISTS "garmentUploadId" TEXT,
ADD COLUMN IF NOT EXISTS "garmentImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "fitStyle" TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS "comparisonLabel" TEXT;

ALTER TABLE "Upload"
ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'general';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Profile_avatarUploadId_fkey'
  ) THEN
    ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_avatarUploadId_fkey"
    FOREIGN KEY ("avatarUploadId") REFERENCES "Upload"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TryOnRequest_garmentUploadId_fkey'
  ) THEN
    ALTER TABLE "TryOnRequest"
    ADD CONSTRAINT "TryOnRequest_garmentUploadId_fkey"
    FOREIGN KEY ("garmentUploadId") REFERENCES "Upload"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
