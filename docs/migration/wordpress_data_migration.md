# WordPress Data Migration

How the data moves from the current WordPress site (offloadagency.com) to the new platform. Target structures are in `docs/architectural design/`; requirements in `docs/requirements/`. The import tool is built after the platform itself (`01` implementation, phase 8).

**Personal data rule:** this document, chat, tickets, commits and logs contain counts, field names and ids only. Never copy emails, names, phone numbers, password hashes, Stripe ids, file names or message text out of the export. Reports that list people are written to the git-ignored `wp-db-export/reports/` folder.

---

## 1. Plan

| Stage | Where | Data | Outbound mode |
|---|---|---|---|
| 1. Build and test the platform | Local | Data created by hand and by tests | `redirect` |
| 2. Rehearse the import (as often as needed) | Local | Current WordPress export | `redirect`, Stripe test keys |
| 3. Test on production | Production VM, not yet on the real domain | Current WordPress export | `redirect`, Stripe test keys |
| 4. Go-live | Production VM | Fresh export taken on the day | `live`, Stripe live keys |

- The import in stages 2 and 3 is for testing only. On go-live day the production database is emptied and the import runs again from a fresh export.
- The site is down for one day for go-live; two to three days are acceptable if testing needs them.
- The project owner signs off each stage.

## 2. Sources

| Source | Location | Use |
|---|---|---|
| SQL dump | `wp-db-export/offload_db_<date>.sql` | Restored into a MariaDB container; the import reads from it |
| SQLite copy | `wp-db-export/wp.sqlite` | Analysis only (`node --no-warnings q.mjs "<SQL>"`) |
| Uploads | `wp-db-export/uploads/` | Copy of `wp-content/uploads` |
| Elementor export | `wp-db-export/elementor-export/` | Screen and rule analysis only, not migrated |

`wp-db-export/` and `scripts/migration/` are git-ignored. The migration is a one-time local task.

**MariaDB container:**

```
docker run -d --name wp-source -e MARIADB_ROOT_PASSWORD=<local only> -e MARIADB_DATABASE=wp -p 127.0.0.1:3307:3306 mariadb:11.8
docker exec -i wp-source mariadb -uroot -p<local only> wp < wp-db-export/offload_db_<date>.sql
```

The import connects with `mysql2` to `127.0.0.1:3307` and reads only. Remove the container after each run (`docker rm -f wp-source`).

## 3. Volumes (export of 21 Nov 2026)

| Entity | Count |
|---|---|
| User accounts | 898 |
| Players | 706 |
| Club / union / college-university / brand managers | 127 / 7 / 6 / 4 |
| Administrators / Offload Admins | 5 / 2 |
| `subscriber` role (WordPress default) | 41 |
| Clubs / unions / colleges-universities / brands | 66 / 3 / 5 / 4 |
| Offers | 5 (1 trashed) |
| Applications | 169 (20 point to an offer that still exists) |
| Messages | 995 |
| Subscriptions | 58 (27 active, 12 cancelled, 10 on hold, 9 pending) |
| Shop orders / refunds | 216 / 15 |
| Attachments referenced | 1,526 |

The tool recounts these on every run; the report compares them with this table.

## 4. Tool

`scripts/migration/` (TypeScript, run with `node --env-file=.env.local --experimental-strip-types scripts/migration/run.ts <step>`):

| File | Job |
|---|---|
| `source.ts` | MariaDB connection and typed readers per WordPress table |
| `php-unserialize.ts` | Decodes PHP serialised values (`a:2:{…}`) |
| `map/*.ts` | One file per entity: WordPress row → target input |
| `load/*.ts` | Writes with the app's Prisma client and services' validation schemas, in batches of 200 per transaction, inside `runAsSystem` with `systemActor = 'migration'` |
| `files.ts` | Image conversion and upload (section 9) |
| `places.ts` | Place id lookup (section 7.4) |
| `stripe.ts` | Stripe step (section 11) |
| `report.ts` | Writes `wp-db-export/reports/<run-id>/` |
| `run.ts` | `all` or a single step; `--dry-run` maps and validates without writing |

**Rules**
1. **Empty target:** the tool refuses to run unless the target database has no users. Reset locally with `npx prisma migrate reset`.
2. **Repeatable:** the same export gives the same result. Every row stores its WordPress id in `legacyId`.
3. **Silent:** no emails, Kit calls or notifications are produced. The tool writes rows directly and never calls `enqueue` or `notify`; `OUTBOUND_MODE=redirect` is a second safety net.
4. **Validated:** every mapped row is checked with the app's zod schemas. A row that fails is imported with the failing field left empty and a warning, unless the field is required, in which case the row is skipped with the reason.
5. **Private logs:** console output shows step names and counts only.

**Load order:** reference data → staff and users → player profiles → organisations → memberships → organisation children → files → verification requests → offers → applications → conversations and messages → billing history → Stripe step (stage 3 and go-live only) → place ids → final counts.

## 5. Users

| WordPress | Target | Rule |
|---|---|---|
| `wp_users.ID` | `User.legacyId` | |
| `user_email` | `email` | trimmed, lower case; the tool stops if two accounts differ only by case |
| `user_registered` | `legacyRegisteredAt` | `createdAt` = migration time, so the 180-day unverified clock starts at go-live |
| `user_pass` | `Account.password` | hash wrapping (section 6) |
| `first_name`, `last_name` | `firstName`, `lastName` | |
| `wp_capabilities` | `role` | `player` → `PLAYER`; `club_manager`, `union_manager`, `college_university_manager`, `brand_manager` → `MANAGER`; `administrator` → `ADMINISTRATOR`; `offload_admin` → `OFFLOAD_ADMIN` |
| `subscriber` role | not imported | listed in the report for the owner to decide later |
| `is_email_verified = "true"` | `isEmailVerified = true`, `emailVerifiedAt = user_registered` | otherwise false; asked to verify at each sign-in |
| `is_terms_accepted = "true"` | `termsAcceptedAt = user_registered`, `termsVersion = 'wordpress'` | they see the new-terms banner (`05`) |
| MailPoet subscriber status | `isNewsletterOptedIn` | `subscribed` → true; anything else or missing → false |
| `description` | `bio` | cut to 2,000 with a warning |
| `date_of_birth` | `dateOfBirth` | `YYYY-MM-DD` or Unix seconds (27 rows) |
| `nationality` | `nationalities` | serialised array of lower-case ISO codes → upper-case array; 111 players have more than one |
| `personal_phone` | `personalPhone` | E.164 when it parses, otherwise empty with a warning |
| `profile_picture` | `profilePictureId` | file (section 9) |
| `is_document_verified = "true"` | `documentStatus = VERIFIED` and an `APPROVED` `VerificationRequest` decided by the system | |
| document present, not verified | `AWAITING_REVIEW` with a `PENDING` request | appears in the staff queue |
| no document | `NONE` | |

- **Staff:** the 5 Administrators and 2 Offload Admins are imported with their roles, passwords and email verified. Staff need no document.
- The report lists accounts whose email is not verified, for information only.

## 6. Passwords

All accounts use phpass (`$P$B…`). Each value becomes `wp-phpass$<the first 12 characters: $P$ + rounds + salt>$<Argon2id hash of the full phpass hash>`. On first sign-in the app verifies it and replaces it with a plain Argon2id hash (`01` implementation section 8.2). No phpass hash is stored as is. Users keep their passwords and notice nothing.

## 7. Players, managers and organisations

### 7.1 Player profile

| WordPress usermeta | Target | Rule |
|---|---|---|
| `primary_position`, `secondary_position`, `other_position` | position ids | slugs map one to one, except `inside_center` → `inside_centre`, `outside_center` → `outside_centre`; the 4 `other_position` values stored as one-item lists take that item |
| `height`, `weight` | `heightCm`, `weightKg` | integers; out-of-range values left empty with a warning |
| `current_club`, `current_union`, `current_college_university` | `currentClubId`, `currentUnionId`, `currentInstitutionId` | post id → imported organisation; unknown post → empty with a warning |
| `current_contract_end_date` | `contractEndDate` | |
| `league_or_union_player` | `rugbyCode` | `league_only`, `union_only`, `both` |
| `player_qualification`, `eqp` | `PlayerQualification` | serialised list; `eqp = "true"` also adds EQP |
| `highest_qualification` | `highestQualification` | |
| `relocate`, `retired` | `isKeenToRelocate`, `isRetired` | `yes` / `no` |
| `brand_partnership`, `academic_interest`, `is_graduated`, `are_you_capped` | `isOpenToBrandPartnership`, `hasAcademicInterest`, `isGraduated`, `isCapped` | `"true"` → true, anything else false |
| `strength`, `work_ons`, `color_personality` | `strengths`, `workOns`, `colourPersonality` | cut to 500 with a warning |
| `soft_skills`, `game_skills` | `PlayerSkill` | serialised slug lists; "game management" maps by list |
| `eligible_countries`, `capped_countries` | `PlayerCountry` | |
| `capped_age_group` | `PlayerAgeGroup` | `u16s`, `u18s`, `u20s`, `senior` (trim the non-breaking space), `7s` |
| `first_cap`, `last_cap`, `total_caps` | cap fields | |
| `max_speed`, `broad_jump`, `1200_test`, `cmj`, `bench_1rm`, `squats_1rm` | S&C fields | numbers; anything else dropped with a warning |
| `highlight_video` | `highlightVideoUrl` | the app's video parser; invalid → dropped with a warning |
| `featured_videos` | `FeaturedVideo` | repeater: `youtube_video_link`, `how_to_identify` |
| `club_history` | `ClubHistory` | repeater: `club_name`, `start_date`, `end_date`, `coaches_worked_under` |
| `cv_resume` | `cvFileId` | private file |
| `documents` | `VerificationDocument` | private file |
| `instagram`, `youtube`, `linkedin`, `facebook`, `twitter` | social URLs | the app's social normaliser |
| — | `listedAt` | `user_registered` for verified players, so the directory keeps its order |

### 7.2 Organisations

| WordPress | Target | Rule |
|---|---|---|
| post types `clubs`, `unions`, `universities`, `brands` | `type` `CLUB`, `UNION`, `INSTITUTION`, `BRAND` | |
| `post_status` | `publish` → `PUBLISHED`, `pending` → `PENDING`, `draft` → `DRAFT`, `trash` → not imported | |
| `post_title`, `post_name` | `name`, `slug` | keep `post_name` so old URLs redirect one to one |
| `post_content` | `description` | cleaned with the app's sanitiser |
| `_thumbnail_id` | `logoFileId` | |
| `email`, `phone`, `website` | official contact | phone to E.164 where possible (WordPress stored it as a number) |
| address fields, `country`, `map_address` | address fields, `mapAddress` | country upper case; `placeId` in section 7.4; WordPress coordinates not imported |
| `union_registration_number`, `registration_number` | `registrationNumber` | |
| `level`, `previous_years_results` | same | |
| `training_ground`, `playing_ground` | `trainingGround`, `playingGround` | plain text, no place id |
| `type` (universities) | `institutionKind` | `college` / `university` |
| `industry` (brands) | `industryId` / `industryOther` | mapped by hand for the 4 brands, confirmed by the owner in the first rehearsal |
| `pathway_university_college` | `ClubPathway` | a name matching an imported institution (case-insensitive) becomes a link, otherwise text |
| `coaches`, `season_layout`, `training_days` | `Coach`, `Season`, `TrainingSession` | serialised repeaters |
| `id_document` | organisation `VerificationDocument` | published → `APPROVED` request; pending → `PENDING` request |
| social fields | social URLs | normaliser |
| taxonomy `ligue` | `OrganisationLeague` | 18 terms; the two "Women's Super League" spellings merge |

### 7.3 Memberships

- Sources: user meta `current_club`, `current_union`, `current_college_university` for managers; JetEngine relation 72 for brand managers; JetEngine relation 20 (club ↔ user, 6 rows: 4 to manager users, 2 to ids that are not users).
- Every current link becomes an `ACTIVE` membership (source `NEW_ORGANISATION` for the first manager by registration date, `CLAIM` for the others). Verified managers stay verified.
- The manager's type comes from the organisation. A WordPress role that does not match the organisation type is listed in the report.
- **Relation 20:** the rows are listed in the report with what they would add or conflict with. The owner decides each one during the migration run.
- Organisations left with no verified manager are listed for staff.

### 7.4 Place ids

For each organisation address and offer location with a `map_address`, the tool calls Places Text Search (New) with the server key, field mask `places.id,places.formattedAddress`, and `regionCode` from the country. One clear result → `placeId`. No result or several unclear ones → `placeId = null`, listed in the report; the managers see "Pick an address from the list to show it on the map". The tool pauses 100 ms between calls.

## 8. Offers, applications and messages

### 8.1 Offers

| WordPress | Target |
|---|---|
| post type `offers`, not trashed | `Offer` |
| `club_or_union_id` | `organisationId`; `offeredBy` from the organisation |
| `post_title`, `post_content` | title, description (cleaned) |
| `is_paid` | `paid`; empty → offer imported as `CLOSED` if it would otherwise be published without it, with a warning |
| `positions`, `required_skills` | join rows |
| `map_address` | `locationText`; place id from section 7.4 |
| `post_date` | `publishedAt` |
| `expiry` (milliseconds) | `expiresAt`; in the past → `EXPIRED` |

### 8.2 Applications

- Source `wp_jet_cct_applications`. Only rows whose offer was imported; the 149 for deleted offers and the 1 for a trashed offer are left out. Rows for a deleted user are left out.
- `user_id` → the player's profile, `notes` → note (cut to 2,000), `cct_created` → `createdAt`, status `SUBMITTED`.

### 8.3 Messages

Source `wp_jet_cct_messages`:

| Case | Sender party | Recipient party |
|---|---|---|
| type `p2p` | user `from_user` | user `to_user` |
| type `org`, `to_user = 0` | user `from_user` | organisation `to_parent` |
| type `org`, `to_user > 0`, `from_parent` set | organisation `from_parent` (`senderUserId = from_user`) | user `to_user` |
| type `org`, `to_user > 0`, no `from_parent` | user `from_user` | user `to_user` |

- One conversation per party pair (`pairKey`); `lastMessageAt` = newest message.
- Message body: plain text, HTML tags removed, cut to 2,000 with a warning.
- Every party's `lastReadAt` = migration time and `unreadCount = 0`, so nobody gets a flood of unread messages.
- Messages with a sender or recipient that cannot be found are left out and counted.

## 9. Files

1. Resolve each attachment id through `wp_posts` (`attachment`) and `_wp_attached_file` to a path in `wp-db-export/uploads/`. Use the original file, never the `-300x200` copies.
2. Only files referenced by imported rows are copied: profile pictures, logos, coach images, identity and organisation documents, CVs.
3. Each file goes through the app's pipeline code (`worker/images.ts`) directly, not through the outbox: real-type check, HEIC decode, WebP conversion with variants, PDF kept. Results are written to `offload-user-content` with new ids; WordPress file names are never reused.
4. A file that fails the type check is skipped and listed (by attachment id).
5. After the report shows every referenced file in the bucket (count and checksum of each object), the tool deletes the local copies of the migrated files from `wp-db-export/uploads/`. The WordPress server keeps its own copy as the backup until the owner removes it, months after go-live.

Local rehearsals write to a development bucket, never to production.

## 10. Billing history

### 10.1 Plans

| WooCommerce product | New plan key |
|---|---|
| Clubs Monthly Plan (3733) / Annual (3738) | `club_monthly` / `club_annual` |
| Unions Monthly (3736) / Annual (3740) | `union_monthly` / `union_annual` |
| Universities Monthly (5502) / Annual (5505) | `university_monthly` / `university_annual` |
| Brands Monthly (6600) / Annual (6602) | `brand_monthly` / `brand_annual` |
| Test Subscription (3622) | not imported, nor its 17 orders |

### 10.2 Subscriptions

Source: `wp_wc_orders` with `type = 'wps_subscriptions'` and its meta. The organisation comes from the buyer's membership, cross-checked with the organisation's `current_subscription_id`; mismatches are listed.

| WordPress status | Next payment date | Import as |
|---|---|---|
| active | future | `PAID` row, then moved to Stripe in section 11 |
| cancelled | future | `PAID` row, moved to Stripe as "cancel at period end" in section 11, so access continues until that date |
| on-hold | any | `ENDED` history, `endedReason = NON_PAYMENT`; listed in the on-hold report |
| cancelled, pending | past or none | `ENDED` history |

Each row keeps `legacyId`, start date, plan and buyer (`purchasedById`).

### 10.3 Payments

- `shop_order` rows (except test-product orders) → `Payment` with `legacyId`, `stripeInvoiceId = null`, amount, status (`wc-processing`, `wc-completed` → `PAID`; `wc-failed` → `FAILED`; `wc-refunded` → `PAID` plus a refund; `wc-pending`, `wc-cancelled` → not imported), paid date, linked to the imported subscription.
- `shop_order_refund` rows → `Refund` with `legacyId`, `stripeRefundId = null`, amount, linked to the original payment.
- These rows are kept for 6 years like all billing records (SUB-10.2).

### 10.4 Coupons

No coupons are migrated. New discount codes are created by staff in the new platform.

## 11. Stripe step

Runs only in stage 3 (test keys) and on go-live day (live keys). Never during local rehearsals with live keys.

**Order on go-live day:**
1. Turn off renewals in WordPress (WPS Subscriptions) so nobody is charged twice. The owner does this and confirms.
2. Run `run.ts stripe`.
3. Check the report before switching the domain.

**What the step does, per organisation with an active or cancelled-with-time-left subscription:**
1. **Customer:** reuse the buying manager's existing Stripe customer (live mode) and set `metadata.organisationId`; create `BillingAccount`. In test mode a test customer is created instead, because test keys cannot see live customers.
2. **Payment method:** if the customer has a reusable card, set it as the default for invoices. Customers without one are listed; their managers are asked after go-live to add a card through the subscription page.
3. **Subscription:** `subscriptions.create` with the plan's current Price, `trial_end` = the WordPress next payment date, `proration_behavior: 'none'`, `trial_settings.end_behavior.missing_payment_method: 'cancel'`, `metadata.organisationId`, `metadata.legacyId`, and `cancel_at_period_end: true` for cancelled-with-time-left rows. No charge happens until the trial end.
4. Link the local `Subscription` row (`stripeSubscriptionId`) and run `syncSubscription`.
5. If the WordPress subscription price differs from the current plan price, it is listed so the owner can decide.

Rollback before the domain switch: cancel the Stripe subscriptions created in step 3 (they are in trial, nothing was charged) and turn WordPress renewals back on.

## 12. Not migrated

- Contact form submissions (`wp_e_submissions`, 471): deleted, not migrated.
- Form submission records (`wp_jet_fb_records`), WooCommerce products other than the plans, test product and orders, coupons.
- BuddyPress, YITH, Paid Memberships Pro, Jetpack, Yoast, Redirection and MailPoet tables (MailPoet only provides the newsletter flag), Elementor templates, Code Snippets, WordPress options.
- Notifications (none are imported).

## 13. Reports

Each run writes `wp-db-export/reports/<run-id>/`:

| File | Contents |
|---|---|
| `summary.md` | Counts per entity: read, imported, skipped (by reason), warnings; comparison with section 3 |
| `warnings.csv` | Entity, WordPress id, field, problem |
| `subscribers.csv` | The `subscriber` accounts not imported |
| `relation-20.csv` | The 6 relation rows and what each would change |
| `test-records.csv` | Candidate test records (names such as "Test", the test product's buyers) for the owner to confirm |
| `memberships.csv` | Role/type mismatches, organisations without a verified manager |
| `places.csv` | Addresses without a place id |
| `on-hold.csv` | The on-hold subscriptions: organisation, plan, last payment, next payment date |
| `stripe.csv` | Per organisation: customer reused or created, card present, subscription created, price difference |
| `files.csv` | Files missing or rejected (attachment ids only) |

**Checks the summary must pass:**

| Check | Expected |
|---|---|
| Users imported = users read − subscribers | equal |
| Verified players in WordPress = verified players imported | equal |
| Organisations per type and status | equal (trash excluded) |
| Memberships = manager links that resolve | equal |
| Offers, applications, messages: imported + left out = read | equal |
| Referenced files = files in the bucket | equal |
| Active + cancelled-with-time-left subscriptions = Stripe subscriptions created | equal (stage 3 and go-live) |
| Sum of imported paid payments − refunds | equals the WooCommerce total for the same orders |

**Spot checks** by the owner after each rehearsal: 20 players, 10 organisations and 5 conversations compared side by side with WordPress.

## 14. Go-live day

| Step | Who |
|---|---|
| 1. Maintenance mode on WordPress (no sign-ups or edits) | Owner |
| 2. Fresh database export and uploads copy into `wp-db-export/` | Owner |
| 3. Empty the production database (`prisma migrate reset` against production, confirmed twice) | Agent, after the owner says go |
| 4. Run the import (all steps except Stripe) against production; check the report | Agent |
| 5. Turn off WordPress renewals | Owner |
| 6. Put live Stripe keys and `OUTBOUND_MODE=live` in `.env.prod`; restart | Owner |
| 7. Run the Stripe step; check `stripe.csv` | Agent |
| 8. Point `offloadagency.com` at the VM; Caddy gets the certificate | Owner |
| 9. Turn on the URL redirects (section 15) | Already in the release |
| 10. Smoke test: sign in as a migrated player and manager, open the directory, send a message, open the subscription page | Owner and agent |
| 11. Watch GlitchTip, webhook deliveries and sign-in failures for the first days | Agent |

The Kit sync starts with `OUTBOUND_MODE=live`: a one-off job pushes every opted-in user to Kit.

## 15. URL redirects

Permanent redirects in `next.config.ts` (`redirects`) or, for id-based ones, a Route Handler that looks up `legacyId`:

| Old URL | New URL |
|---|---|
| `/clubs/{slug}/`, `/unions/{slug}/`, `/brands/{slug}/` | same path without the trailing slash |
| `/universities/{slug}/` | `/colleges-universities/{slug}` |
| `/offers/{slug}/` | `/offers/{id}` by legacy id |
| `/player-single/{userId}/main/` | `/players/{id}` by legacy id |
| `/about-us/`, `/pricing/`, `/contact/`, `/register/`, `/login/`, `/forgot-password/`, `/players/` | matching new pages |
| `/terms-and-conditions/`, `/privacy-policy/`, `/refund_policy/` | `/terms-and-conditions`, `/privacy-policy`, `/refund-policy` |
| `/my-account/`, `/shop/`, `/basket/`, `/checkout/` | `/dashboard` or `/pricing` |

## 16. Open questions

None at the moment. Decisions that wait for the migration run (subscriber accounts, relation 20 rows, test records, brand industries) are made by the owner from the reports.
