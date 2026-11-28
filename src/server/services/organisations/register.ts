import 'server-only'

import type { OrganisationType } from '@/generated/prisma/client'
import { DUPLICATE_NAME_THRESHOLD } from '@/lib/constants'
import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { notify, staffUserIds } from '@/server/notify'
import { uniqueSlug } from '@/server/services/organisations/slug'

export type DuplicateCandidate = { id: string; name: string; city: string | null }

/** Published or pending organisations of the same type that look like the one being added (03 section 7.2). */
export async function findPossibleDuplicates(
  client: Tx | typeof db,
  input: { type: OrganisationType; name: string; country: string; registrationNumber?: string },
): Promise<DuplicateCandidate[]> {
  const registration = input.registrationNumber?.trim() ?? ''
  return client.$queryRaw<DuplicateCandidate[]>`
    SELECT "id", "name", "city" FROM "Organisation"
    WHERE "type" = ${input.type}::"OrganisationType" AND "status" <> 'DRAFT' AND "deletedAt" IS NULL AND (
      ("country" = ${input.country} AND similarity(immutable_unaccent(lower("name")), immutable_unaccent(lower(${input.name}))) > ${DUPLICATE_NAME_THRESHOLD})
      OR (${registration} <> '' AND upper(replace("registrationNumber", ' ', '')) = upper(replace(${registration}, ' ', '')))
    ) LIMIT 5`
}

export type NewOrganisationInput = {
  type: OrganisationType
  name: string
  country: string
  officialEmail?: string
  officialPhone?: string
  registrationNumber?: string
  website?: string
  industryId?: string
  industryOther?: string
  institutionKind?: 'COLLEGE' | 'UNIVERSITY'
}

async function assertNoCurrentMembership(tx: Tx, userId: string): Promise<void> {
  const current = await tx.organisationMember.findFirst({ where: { userId, status: { in: ['PENDING', 'ACTIVE'] } }, select: { id: true } })
  if (current) throw new DomainError('has-membership', 'You already belong to an organisation.')
}

/** A manager adds a new organisation: it starts PENDING and staff are told (03 section 7.1). */
export async function registerOrganisation(tx: Tx, userId: string, input: NewOrganisationInput): Promise<string> {
  await assertNoCurrentMembership(tx, userId)
  const duplicates = await findPossibleDuplicates(tx, input)
  const slug = await uniqueSlug(tx, input.type, input.name)
  const organisation = await tx.organisation.create({
    data: {
      type: input.type,
      status: 'PENDING',
      slug,
      name: input.name,
      country: input.country,
      officialEmail: input.officialEmail ?? null,
      officialPhone: input.officialPhone ?? null,
      registrationNumber: input.registrationNumber ?? null,
      website: input.website ?? null,
      industryId: input.industryId ?? null,
      industryOther: input.industryId === 'other' ? (input.industryOther ?? null) : null,
      institutionKind: input.type === 'INSTITUTION' ? (input.institutionKind ?? 'COLLEGE') : null,
    },
  })
  await tx.organisationMember.create({
    data: { userId, organisationId: organisation.id, status: 'PENDING', source: 'NEW_ORGANISATION' },
  })
  const request = await tx.verificationRequest.create({
    data: {
      subject: 'ORGANISATION',
      organisationId: organisation.id,
      possibleDuplicateOfId: duplicates[0]?.id ?? null,
    },
  })
  await audit(tx, {
    action: 'organisation.registered',
    subjectType: 'Organisation',
    subjectId: organisation.id,
    relatedUserIds: [userId],
    relatedOrgId: organisation.id,
    data: { type: input.type, requestId: request.id },
  })
  await notify(tx, {
    userIds: await staffUserIds(tx),
    type: 'verification.organisation-pending',
    linkPath: '/dashboard/staff/verification',
    subjectName: input.name,
  })
  return organisation.id
}

/** A manager asks to manage an existing published organisation. Rights come only after staff approve. */
export async function claimOrganisation(tx: Tx, userId: string, organisationId: string): Promise<void> {
  await assertNoCurrentMembership(tx, userId)
  const organisation = await tx.organisation.findFirst({
    where: { id: organisationId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, name: true },
  })
  if (!organisation) throw new DomainError('not-found', 'This organisation is not available.')
  const member = await tx.organisationMember.create({
    data: { userId, organisationId, status: 'PENDING', source: 'CLAIM' },
  })
  await audit(tx, {
    action: 'organisation.claimed',
    subjectType: 'OrganisationMember',
    subjectId: member.id,
    relatedUserIds: [userId],
    relatedOrgId: organisationId,
  })
  await notify(tx, {
    userIds: await staffUserIds(tx),
    type: 'verification.claim-pending',
    linkPath: '/dashboard/staff/verification',
    subjectName: organisation.name,
  })
}
