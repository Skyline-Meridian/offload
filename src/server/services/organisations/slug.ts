import 'server-only'

import type { OrganisationType } from '@/generated/prisma/client'
import { slugify } from '@/lib/format/slug'
import type { Tx } from '@/server/db'

/** `slug`, then `slug-2`, `slug-3` …. The database keeps slugs unique across all types. Also avoids old slugs that redirect. */
export async function uniqueSlug(tx: Tx, _type: OrganisationType, name: string, exceptOrganisationId?: string): Promise<string> {
  const base = slugify(name)
  for (let n = 1; n < 1000; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const [taken, redirect] = await Promise.all([
      tx.organisation.findFirst({
        where: { slug: candidate, ...(exceptOrganisationId ? { id: { not: exceptOrganisationId } } : {}) },
        select: { id: true },
      }),
      tx.organisationSlugRedirect.findUnique({ where: { oldSlug: candidate }, select: { organisationId: true } }),
    ])
    if (!taken && (!redirect || redirect.organisationId === exceptOrganisationId)) return candidate
  }
  throw new Error('Could not find a free slug')
}
