DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'EARN' AND enumtypid = 'RewardTransactionType'::regtype
  ) THEN
    CREATE TYPE "RewardTransactionType" AS ENUM ('EARN', 'SPEND', 'ADJUSTMENT');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "RewardTransactionType" AS ENUM ('EARN', 'SPEND', 'ADJUSTMENT');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'FIRST_TRY_ON' AND enumtypid = 'RewardReason'::regtype
  ) THEN
    CREATE TYPE "RewardReason" AS ENUM (
      'FIRST_TRY_ON',
      'LOOK_SHARE',
      'REFERRAL_INVITE',
      'REFERRAL_SUCCESS',
      'PROFILE_COMPLETE',
      'CHALLENGE_PARTICIPATION',
      'COUPON_UNLOCK',
      'COUPON_REDEEM',
      'ADMIN_ADJUSTMENT'
    );
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "RewardReason" AS ENUM (
      'FIRST_TRY_ON',
      'LOOK_SHARE',
      'REFERRAL_INVITE',
      'REFERRAL_SUCCESS',
      'PROFILE_COMPLETE',
      'CHALLENGE_PARTICIPATION',
      'COUPON_UNLOCK',
      'COUPON_REDEEM',
      'ADMIN_ADJUSTMENT'
    );
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'CODE_CREATED' AND enumtypid = 'ReferralEventType'::regtype
  ) THEN
    CREATE TYPE "ReferralEventType" AS ENUM ('CODE_CREATED', 'INVITE_SENT', 'SIGNUP', 'CONVERTED');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "ReferralEventType" AS ENUM ('CODE_CREATED', 'INVITE_SENT', 'SIGNUP', 'CONVERTED');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'PERCENTAGE' AND enumtypid = 'CouponType'::regtype
  ) THEN
    CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BONUS');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BONUS');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'UNLOCKED' AND enumtypid = 'CouponRedemptionStatus'::regtype
  ) THEN
    CREATE TYPE "CouponRedemptionStatus" AS ENUM ('UNLOCKED', 'REDEEMED', 'EXPIRED');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "CouponRedemptionStatus" AS ENUM ('UNLOCKED', 'REDEEMED', 'EXPIRED');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'CAMPUS_CASUAL' AND enumtypid = 'CampaignTheme'::regtype
  ) THEN
    CREATE TYPE "CampaignTheme" AS ENUM ('CAMPUS_CASUAL', 'INTERVIEW_READY', 'FEST_LOOK', 'BUDGET_UNDER_999');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "CampaignTheme" AS ENUM ('CAMPUS_CASUAL', 'INTERVIEW_READY', 'FEST_LOOK', 'BUDGET_UNDER_999');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAFT' AND enumtypid = 'CampaignStatus'::regtype
  ) THEN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'JOINED' AND enumtypid = 'ChallengeStatus'::regtype
  ) THEN
    CREATE TYPE "ChallengeStatus" AS ENUM ('JOINED', 'COMPLETED', 'CLAIMED');
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE "ChallengeStatus" AS ENUM ('JOINED', 'COMPLETED', 'CLAIMED');
END
$$;

CREATE TABLE IF NOT EXISTS "RewardWallet" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "balancePoints" INTEGER NOT NULL DEFAULT 0,
  "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
  "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
  "tierLabel" TEXT NOT NULL DEFAULT 'Starter',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RewardTransaction" (
  "id" TEXT PRIMARY KEY,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "RewardTransactionType" NOT NULL,
  "reason" "RewardReason" NOT NULL,
  "amountPoints" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "referenceKey" TEXT UNIQUE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "RewardWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ReferralCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ReferralEvent" (
  "id" TEXT PRIMARY KEY,
  "referralCodeId" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT,
  "eventType" "ReferralEventType" NOT NULL,
  "rewardPoints" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralEvent_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralEvent_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralEvent_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "theme" "CampaignTheme" NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "targetAudience" TEXT NOT NULL DEFAULT 'students',
  "budgetLabel" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CampaignBanner" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "ctaLabel" TEXT NOT NULL,
  "ctaRoute" TEXT NOT NULL,
  "imageUrl" TEXT,
  "themeTone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignBanner_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "CouponType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "rewardCostPoints" INTEGER,
  "unlockThreshold" INTEGER,
  "minSpend" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
  "id" TEXT PRIMARY KEY,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT,
  "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'UNLOCKED',
  "pointsSpent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redeemedAt" TIMESTAMP(3),
  CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponRedemption_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "RewardWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LookRating" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "savedLookId" TEXT,
  "tryOnRequestId" TEXT,
  "productId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LookRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LookRating_savedLookId_fkey" FOREIGN KEY ("savedLookId") REFERENCES "SavedLook"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LookRating_tryOnRequestId_fkey" FOREIGN KEY ("tryOnRequestId") REFERENCES "TryOnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LookRating_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ShareEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "savedLookId" TEXT,
  "tryOnRequestId" TEXT,
  "channel" TEXT NOT NULL,
  "rewardGranted" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ShareEvent_savedLookId_fkey" FOREIGN KEY ("savedLookId") REFERENCES "SavedLook"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ShareEvent_tryOnRequestId_fkey" FOREIGN KEY ("tryOnRequestId") REFERENCES "TryOnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChallengeParticipation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "campaignId" TEXT,
  "challengeName" TEXT NOT NULL,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'JOINED',
  "rewardPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ChallengeParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChallengeParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
