CREATE TABLE IF NOT EXISTS "TryOnCredit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'FREE',
  "dailyLimit" INTEGER NOT NULL DEFAULT 3,
  "usedToday" INTEGER NOT NULL DEFAULT 0,
  "bonusCredits" INTEGER NOT NULL DEFAULT 0,
  "periodDate" TEXT NOT NULL,
  "premiumUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TryOnCredit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TryOnCredit_userId_key" ON "TryOnCredit"("userId");
CREATE INDEX IF NOT EXISTS "TryOnCredit_plan_idx" ON "TryOnCredit"("plan");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TryOnCredit_userId_fkey'
  ) THEN
    ALTER TABLE "TryOnCredit"
    ADD CONSTRAINT "TryOnCredit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
