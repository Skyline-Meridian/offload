-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'MANAGER', 'OFFLOAD_ADMIN', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NONE', 'AWAITING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RugbyCode" AS ENUM ('LEAGUE_ONLY', 'UNION_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('U16', 'U18', 'U20', 'SENIOR', 'SEVENS');

-- CreateEnum
CREATE TYPE "CountryKind" AS ENUM ('ELIGIBLE', 'CAPPED');

-- CreateEnum
CREATE TYPE "SkillKind" AS ENUM ('SOFT', 'GAME');

-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('CLUB', 'UNION', 'INSTITUTION', 'BRAND');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED', 'BANNED');

-- CreateEnum
CREATE TYPE "InstitutionKind" AS ENUM ('COLLEGE', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MembershipSource" AS ENUM ('NEW_ORGANISATION', 'CLAIM');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaidStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'CONTACTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PartyKind" AS ENUM ('USER', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "VerificationSubject" AS ENUM ('PLAYER', 'MANAGER', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionKind" AS ENUM ('PAID', 'TRIAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "EndedReason" AS ENUM ('CANCELLED', 'NON_PAYMENT', 'TRIAL_ENDED', 'STAFF');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'FAILED', 'OPEN', 'VOID');

-- CreateEnum
CREATE TYPE "DiscountDuration" AS ENUM ('ONCE', 'REPEATING', 'FOREVER');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('PROFILE_PICTURE', 'ORGANISATION_LOGO', 'COACH_IMAGE', 'IDENTITY_DOCUMENT', 'ORGANISATION_DOCUMENT', 'CV', 'EXPORT');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'READY', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('STAFF_INVITE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "pendingEmail" TEXT,
    "isEmailUndeliverable" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "previousRole" "UserRole",
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" DATE,
    "nationalities" CHAR(2)[],
    "personalPhone" TEXT,
    "bio" VARCHAR(2000),
    "profilePictureId" UUID,
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
    "documentDecidedAt" TIMESTAMP(3),
    "documentDecidedById" UUID,
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "isNewsletterOptedIn" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "unverifiedReminderStage" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "legacyId" TEXT,
    "legacyRegisteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" UUID NOT NULL,
    "type" "TokenType" NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookieConsent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categories" TEXT[],
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" UUID NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "ownerId" UUID,
    "variants" TEXT[],
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "linkPath" TEXT,
    "subjectName" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorKind" "ActorKind" NOT NULL,
    "actorId" UUID,
    "systemActor" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "relatedUserIds" UUID[],
    "relatedOrgId" UUID,
    "data" JSONB,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SkillKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" CHAR(2),
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "primaryPositionId" TEXT,
    "secondaryPositionId" TEXT,
    "otherPositionId" TEXT,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "currentClubId" UUID,
    "currentClubText" TEXT,
    "currentUnionId" UUID,
    "currentUnionText" TEXT,
    "currentInstitutionId" UUID,
    "currentInstitutionText" TEXT,
    "contractEndDate" DATE,
    "rugbyCode" "RugbyCode",
    "highestQualification" TEXT,
    "isKeenToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "isOpenToBrandPartnership" BOOLEAN NOT NULL DEFAULT false,
    "strengths" VARCHAR(500),
    "workOns" VARCHAR(500),
    "colourPersonality" TEXT,
    "isCapped" BOOLEAN NOT NULL DEFAULT false,
    "firstCap" DATE,
    "lastCap" DATE,
    "totalCaps" INTEGER,
    "maxSpeedMs" DECIMAL(5,2),
    "broadJumpCm" DECIMAL(6,1),
    "test1200Sec" DECIMAL(6,1),
    "cmjCm" DECIMAL(5,1),
    "bench1rmKg" DECIMAL(5,1),
    "squat1rmKg" DECIMAL(5,1),
    "hasAcademicInterest" BOOLEAN NOT NULL DEFAULT false,
    "isGraduated" BOOLEAN NOT NULL DEFAULT false,
    "highlightVideoUrl" TEXT,
    "cvFileId" UUID,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "xUrl" TEXT,
    "listedAt" TIMESTAMP(3),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCountry" (
    "playerId" UUID NOT NULL,
    "country" CHAR(2) NOT NULL,
    "kind" "CountryKind" NOT NULL,

    CONSTRAINT "PlayerCountry_pkey" PRIMARY KEY ("playerId","country","kind")
);

-- CreateTable
CREATE TABLE "PlayerAgeGroup" (
    "playerId" UUID NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,

    CONSTRAINT "PlayerAgeGroup_pkey" PRIMARY KEY ("playerId","ageGroup")
);

-- CreateTable
CREATE TABLE "PlayerQualification" (
    "playerId" UUID NOT NULL,
    "qualificationId" TEXT NOT NULL,

    CONSTRAINT "PlayerQualification_pkey" PRIMARY KEY ("playerId","qualificationId")
);

-- CreateTable
CREATE TABLE "PlayerSkill" (
    "playerId" UUID NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "PlayerSkill_pkey" PRIMARY KEY ("playerId","skillId")
);

-- CreateTable
CREATE TABLE "ClubHistory" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "clubName" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "coaches" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ClubHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedVideo" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "howToIdentify" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "FeaturedVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" UUID NOT NULL,
    "type" "OrganisationType" NOT NULL,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoFileId" UUID,
    "officialEmail" TEXT,
    "officialPhone" TEXT,
    "website" TEXT,
    "foundedYear" INTEGER,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postcode" TEXT,
    "country" CHAR(2),
    "mapAddress" TEXT,
    "placeId" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "xUrl" TEXT,
    "youtubeUrl" TEXT,
    "registrationNumber" TEXT,
    "trainingGround" TEXT,
    "trainingGroundPlaceId" TEXT,
    "playingGround" TEXT,
    "playingGroundPlaceId" TEXT,
    "previousResults" TEXT,
    "level" TEXT,
    "institutionKind" "InstitutionKind",
    "industryId" TEXT,
    "industryOther" VARCHAR(60),
    "documentFileId" UUID,
    "publishedAt" TIMESTAMP(3),
    "statusReason" TEXT,
    "statusChangedById" UUID,
    "deletedAt" TIMESTAMP(3),
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationSlugRedirect" (
    "oldSlug" TEXT NOT NULL,
    "organisationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganisationSlugRedirect_pkey" PRIMARY KEY ("oldSlug")
);

-- CreateTable
CREATE TABLE "OrganisationMember" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "source" "MembershipSource" NOT NULL,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "OrganisationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "photoFileId" UUID,
    "jobRole" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "day" "Weekday" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationLeague" (
    "organisationId" UUID NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "OrganisationLeague_pkey" PRIMARY KEY ("organisationId","leagueId")
);

-- CreateTable
CREATE TABLE "ClubPathway" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "institutionId" UUID,
    "institutionText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ClubPathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationChangeRequest" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "OrganisationChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" UUID NOT NULL,
    "subject" "VerificationSubject" NOT NULL,
    "userId" UUID,
    "organisationId" UUID,
    "membershipId" UUID,
    "isClaim" BOOLEAN NOT NULL DEFAULT false,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "reason" TEXT,
    "possibleDuplicateOfId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "requestId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("requestId","fileId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "offeredBy" "OrganisationType" NOT NULL,
    "title" VARCHAR(150),
    "description" TEXT,
    "paid" "PaidStatus",
    "locationText" TEXT,
    "locationPlaceId" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "expiryReminderSentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedByStaffId" UUID,
    "closedReason" TEXT,
    "copiedFromId" UUID,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPosition" (
    "offerId" UUID NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "OfferPosition_pkey" PRIMARY KEY ("offerId","positionId")
);

-- CreateTable
CREATE TABLE "OfferSkill" (
    "offerId" UUID NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "OfferSkill_pkey" PRIMARY KEY ("offerId","skillId")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "note" VARCHAR(2000),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedById" UUID,
    "resubmittedAt" TIMESTAMP(3),
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "pairKey" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParty" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "kind" "PartyKind" NOT NULL,
    "userId" UUID,
    "organisationId" UUID,
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ConversationParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "senderOrgId" UUID,
    "body" VARCHAR(2000) NOT NULL,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisationType" "OrganisationType" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "currentPriceId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAccount" (
    "organisationId" UUID NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "billingName" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("organisationId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "kind" "SubscriptionKind" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "planId" UUID NOT NULL,
    "planPriceId" UUID,
    "stripeSubscriptionId" TEXT,
    "purchasedById" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "isCancelledAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "scheduledPlanId" UUID,
    "stripeScheduleId" TEXT,
    "discountCodeId" UUID,
    "pastDueSince" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedRemainingSeconds" INTEGER,
    "accessEndedAt" TIMESTAMP(3),
    "endedReason" "EndedReason",
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "stripeInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "legacyId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "discountPence" INTEGER NOT NULL DEFAULT 0,
    "amountRefundedPence" INTEGER NOT NULL DEFAULT 0,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailureMessage" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "stripeRefundId" TEXT,
    "legacyId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "duration" "DiscountDuration" NOT NULL,
    "durationMonths" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "timesRedeemed" INTEGER NOT NULL DEFAULT 0,
    "stripeCouponId" TEXT NOT NULL,
    "stripePromotionCodeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodePlan" (
    "discountCodeId" UUID NOT NULL,
    "planId" UUID NOT NULL,

    CONSTRAINT "DiscountCodePlan_pkey" PRIMARY KEY ("discountCodeId","planId")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingReminder" (
    "subscriptionId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "BillingReminder_pkey" PRIMARY KEY ("subscriptionId","kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyId_key" ON "User"("legacyId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_documentStatus_idx" ON "User"("documentStatus");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_nationalities_idx" ON "User" USING GIN ("nationalities");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Token_tokenHash_key" ON "Token"("tokenHash");

-- CreateIndex
CREATE INDEX "CookieConsent_userId_createdAt_idx" ON "CookieConsent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "File_ownerId_idx" ON "File"("ownerId");

-- CreateIndex
CREATE INDEX "File_status_createdAt_idx" ON "File"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OutboxMessage_status_nextAttemptAt_idx" ON "OutboxMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "AuditEvent_subjectType_subjectId_createdAt_idx" ON "AuditEvent"("subjectType", "subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_relatedOrgId_createdAt_idx" ON "AuditEvent"("relatedOrgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_legacyId_key" ON "PlayerProfile"("legacyId");

-- CreateIndex
CREATE INDEX "PlayerProfile_listedAt_id_idx" ON "PlayerProfile"("listedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "PlayerProfile_primaryPositionId_idx" ON "PlayerProfile"("primaryPositionId");

-- CreateIndex
CREATE INDEX "PlayerProfile_secondaryPositionId_idx" ON "PlayerProfile"("secondaryPositionId");

-- CreateIndex
CREATE INDEX "PlayerProfile_otherPositionId_idx" ON "PlayerProfile"("otherPositionId");

-- CreateIndex
CREATE INDEX "PlayerProfile_heightCm_idx" ON "PlayerProfile"("heightCm");

-- CreateIndex
CREATE INDEX "PlayerProfile_weightKg_idx" ON "PlayerProfile"("weightKg");

-- CreateIndex
CREATE INDEX "PlayerProfile_contractEndDate_idx" ON "PlayerProfile"("contractEndDate");

-- CreateIndex
CREATE INDEX "PlayerProfile_rugbyCode_idx" ON "PlayerProfile"("rugbyCode");

-- CreateIndex
CREATE INDEX "PlayerProfile_currentClubId_idx" ON "PlayerProfile"("currentClubId");

-- CreateIndex
CREATE INDEX "PlayerProfile_currentUnionId_idx" ON "PlayerProfile"("currentUnionId");

-- CreateIndex
CREATE INDEX "PlayerProfile_currentInstitutionId_idx" ON "PlayerProfile"("currentInstitutionId");

-- CreateIndex
CREATE INDEX "PlayerCountry_country_kind_idx" ON "PlayerCountry"("country", "kind");

-- CreateIndex
CREATE INDEX "PlayerQualification_qualificationId_idx" ON "PlayerQualification"("qualificationId");

-- CreateIndex
CREATE INDEX "PlayerSkill_skillId_idx" ON "PlayerSkill"("skillId");

-- CreateIndex
CREATE INDEX "ClubHistory_playerId_idx" ON "ClubHistory"("playerId");

-- CreateIndex
CREATE INDEX "Achievement_playerId_idx" ON "Achievement"("playerId");

-- CreateIndex
CREATE INDEX "FeaturedVideo_playerId_idx" ON "FeaturedVideo"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_legacyId_key" ON "Organisation"("legacyId");

-- CreateIndex
CREATE INDEX "Organisation_type_status_name_idx" ON "Organisation"("type", "status", "name");

-- CreateIndex
CREATE INDEX "Organisation_type_status_country_idx" ON "Organisation"("type", "status", "country");

-- CreateIndex
CREATE INDEX "Organisation_industryId_idx" ON "Organisation"("industryId");

-- CreateIndex
CREATE INDEX "OrganisationSlugRedirect_organisationId_idx" ON "OrganisationSlugRedirect"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationMember_organisationId_status_idx" ON "OrganisationMember"("organisationId", "status");

-- CreateIndex
CREATE INDEX "OrganisationMember_userId_status_idx" ON "OrganisationMember"("userId", "status");

-- CreateIndex
CREATE INDEX "Coach_organisationId_idx" ON "Coach"("organisationId");

-- CreateIndex
CREATE INDEX "Season_organisationId_idx" ON "Season"("organisationId");

-- CreateIndex
CREATE INDEX "TrainingSession_organisationId_idx" ON "TrainingSession"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationLeague_leagueId_idx" ON "OrganisationLeague"("leagueId");

-- CreateIndex
CREATE INDEX "ClubPathway_organisationId_idx" ON "ClubPathway"("organisationId");

-- CreateIndex
CREATE INDEX "OrganisationChangeRequest_organisationId_status_idx" ON "OrganisationChangeRequest"("organisationId", "status");

-- CreateIndex
CREATE INDEX "OrganisationChangeRequest_status_createdAt_idx" ON "OrganisationChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_subject_status_submittedAt_idx" ON "VerificationRequest"("subject", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_status_idx" ON "VerificationRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "VerificationRequest_organisationId_status_idx" ON "VerificationRequest"("organisationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_legacyId_key" ON "Offer"("legacyId");

-- CreateIndex
CREATE INDEX "Offer_status_expiresAt_idx" ON "Offer"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Offer_organisationId_status_expiresAt_idx" ON "Offer"("organisationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Offer_offeredBy_status_idx" ON "Offer"("offeredBy", "status");

-- CreateIndex
CREATE INDEX "Offer_publishedAt_id_idx" ON "Offer"("publishedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "OfferPosition_positionId_idx" ON "OfferPosition"("positionId");

-- CreateIndex
CREATE INDEX "OfferSkill_skillId_idx" ON "OfferSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_legacyId_key" ON "Application"("legacyId");

-- CreateIndex
CREATE INDEX "Application_organisationId_createdAt_idx" ON "Application"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "Application_playerId_createdAt_idx" ON "Application"("playerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_offerId_playerId_key" ON "Application"("offerId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationParty_userId_idx" ON "ConversationParty"("userId");

-- CreateIndex
CREATE INDEX "ConversationParty_organisationId_idx" ON "ConversationParty"("organisationId");

-- CreateIndex
CREATE INDEX "ConversationParty_conversationId_idx" ON "ConversationParty"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_legacyId_key" ON "Message"("legacyId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripeProductId_key" ON "Plan"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_currentPriceId_key" ON "Plan"("currentPriceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_stripePriceId_key" ON "PlanPrice"("stripePriceId");

-- CreateIndex
CREATE INDEX "PlanPrice_planId_idx" ON "PlanPrice"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_stripeCustomerId_key" ON "BillingAccount"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_legacyId_key" ON "Subscription"("legacyId");

-- CreateIndex
CREATE INDEX "Subscription_organisationId_status_idx" ON "Subscription"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeInvoiceId_key" ON "Payment"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_legacyId_key" ON "Payment"("legacyId");

-- CreateIndex
CREATE INDEX "Payment_organisationId_createdAt_idx" ON "Payment"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_legacyId_key" ON "Refund"("legacyId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_stripePromotionCodeId_key" ON "DiscountCode"("stripePromotionCodeId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookieConsent" ADD CONSTRAINT "CookieConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_primaryPositionId_fkey" FOREIGN KEY ("primaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_secondaryPositionId_fkey" FOREIGN KEY ("secondaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_otherPositionId_fkey" FOREIGN KEY ("otherPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_currentClubId_fkey" FOREIGN KEY ("currentClubId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_currentUnionId_fkey" FOREIGN KEY ("currentUnionId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_currentInstitutionId_fkey" FOREIGN KEY ("currentInstitutionId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCountry" ADD CONSTRAINT "PlayerCountry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAgeGroup" ADD CONSTRAINT "PlayerAgeGroup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerQualification" ADD CONSTRAINT "PlayerQualification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerQualification" ADD CONSTRAINT "PlayerQualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubHistory" ADD CONSTRAINT "ClubHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedVideo" ADD CONSTRAINT "FeaturedVideo_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationLeague" ADD CONSTRAINT "OrganisationLeague_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationLeague" ADD CONSTRAINT "OrganisationLeague_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPathway" ADD CONSTRAINT "ClubPathway_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPathway" ADD CONSTRAINT "ClubPathway_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationChangeRequest" ADD CONSTRAINT "OrganisationChangeRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPosition" ADD CONSTRAINT "OfferPosition_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPosition" ADD CONSTRAINT "OfferPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferSkill" ADD CONSTRAINT "OfferSkill_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferSkill" ADD CONSTRAINT "OfferSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParty" ADD CONSTRAINT "ConversationParty_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParty" ADD CONSTRAINT "ConversationParty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParty" ADD CONSTRAINT "ConversationParty_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodePlan" ADD CONSTRAINT "DiscountCodePlan_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodePlan" ADD CONSTRAINT "DiscountCodePlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
