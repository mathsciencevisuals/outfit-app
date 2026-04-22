ALTER TABLE "TryOnRequest"
ADD COLUMN "sourceUploadId" TEXT,
ADD COLUMN "statusMessage" TEXT;

ALTER TABLE "TryOnRequest"
ADD CONSTRAINT "TryOnRequest_sourceUploadId_fkey"
FOREIGN KEY ("sourceUploadId") REFERENCES "Upload"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "TryOnRequest_sourceUploadId_idx" ON "TryOnRequest"("sourceUploadId");
