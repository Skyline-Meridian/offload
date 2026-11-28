-- Everything Prisma cannot express in schema.prisma: extensions, an immutable unaccent helper, check constraints,
-- partial and trigram indexes, and database role grants. See docs/implementation/01 (section 7) and the module guides.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is not marked immutable, so it cannot be used in an index directly
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- ─── Users and players ────────────────────────────────────────────────

ALTER TABLE "User" ADD CONSTRAINT user_nationalities_max CHECK (cardinality("nationalities") <= 5);

-- only one of "platform organisation" or "typed text" may be set
ALTER TABLE "PlayerProfile" ADD CONSTRAINT player_club_one CHECK ("currentClubId" IS NULL OR "currentClubText" IS NULL);
ALTER TABLE "PlayerProfile" ADD CONSTRAINT player_union_one CHECK ("currentUnionId" IS NULL OR "currentUnionText" IS NULL);
ALTER TABLE "PlayerProfile" ADD CONSTRAINT player_institution_one CHECK ("currentInstitutionId" IS NULL OR "currentInstitutionText" IS NULL);

CREATE INDEX user_name_trgm ON "User" USING gin
  (public.immutable_unaccent(lower(coalesce("firstName", '') || ' ' || coalesce("lastName", ''))) gin_trgm_ops);
CREATE INDEX player_listed_idx ON "PlayerProfile" ("listedAt" DESC, "id" DESC)
  WHERE "listedAt" IS NOT NULL AND "isHidden" = false;
CREATE INDEX player_club_text_trgm ON "PlayerProfile" USING gin
  (public.immutable_unaccent(lower(coalesce("currentClubText", ''))) gin_trgm_ops);

-- ─── Organisations ────────────────────────────────────────────────────

-- institution kind only for colleges/universities
ALTER TABLE "Organisation" ADD CONSTRAINT org_institution_kind CHECK (("type" = 'INSTITUTION') = ("institutionKind" IS NOT NULL));
ALTER TABLE "ClubPathway" ADD CONSTRAINT pathway_one CHECK (("institutionId" IS NULL) <> ("institutionText" IS NULL));

-- one current membership per manager (GEN-1.3)
CREATE UNIQUE INDEX member_one_current ON "OrganisationMember" ("userId") WHERE "status" IN ('PENDING', 'ACTIVE');
CREATE INDEX org_name_trgm ON "Organisation" USING gin (public.immutable_unaccent(lower("name")) gin_trgm_ops);

-- ─── Offers and messaging ─────────────────────────────────────────────

-- a published (or later) offer must be complete (OFF-1.8)
ALTER TABLE "Offer" ADD CONSTRAINT offer_complete CHECK (
  "status" IN ('DRAFT', 'PENDING') OR
  ("title" IS NOT NULL AND "description" IS NOT NULL AND "paid" IS NOT NULL
   AND "publishedAt" IS NOT NULL AND "expiresAt" IS NOT NULL)
);
CREATE INDEX offer_title_trgm ON "Offer" USING gin (public.immutable_unaccent(lower(coalesce("title", ''))) gin_trgm_ops);

-- a party is either a user or an organisation
ALTER TABLE "ConversationParty" ADD CONSTRAINT party_kind CHECK (
  ("kind" = 'USER' AND "userId" IS NOT NULL AND "organisationId" IS NULL) OR
  ("kind" = 'ORGANISATION' AND "organisationId" IS NOT NULL AND "userId" IS NULL)
);
CREATE UNIQUE INDEX party_unique ON "ConversationParty" ("conversationId", "kind", COALESCE("userId", "organisationId"));
ALTER TABLE "Message" ADD CONSTRAINT message_body_length CHECK (char_length("body") BETWEEN 1 AND 2000);

-- ─── Billing ──────────────────────────────────────────────────────────

CREATE UNIQUE INDEX sub_one_paid ON "Subscription" ("organisationId") WHERE "kind" = 'PAID' AND "status" <> 'ENDED';
CREATE UNIQUE INDEX sub_one_trial ON "Subscription" ("organisationId") WHERE "kind" = 'TRIAL' AND "status" <> 'ENDED';
CREATE UNIQUE INDEX discount_code_active ON "DiscountCode" ("code") WHERE "isActive";
ALTER TABLE "DiscountCode" ADD CONSTRAINT discount_percent CHECK ("percentOff" BETWEEN 1 AND 100);
ALTER TABLE "DiscountCode" ADD CONSTRAINT discount_code_upper CHECK ("code" = upper("code"));

-- ─── Grants (docs/implementation/01, section 7.3) ─────────────────────

-- the application role: read and write everything, except the append-only tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO offload_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO offload_app;
REVOKE UPDATE, DELETE ON "AuditEvent" FROM offload_app;
REVOKE UPDATE, DELETE ON "Message" FROM offload_app;

-- the realtime server only checks sessions and who belongs to which conversation
GRANT SELECT ON "Session", "User", "OrganisationMember", "ConversationParty" TO offload_realtime;

-- the retention job may delete old audit events
GRANT SELECT, DELETE ON "AuditEvent" TO offload_retention;
