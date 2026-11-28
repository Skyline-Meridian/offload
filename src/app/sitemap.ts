import type { MetadataRoute } from 'next'
import { connection } from 'next/server'

import { routes } from '@/lib/routes'
import { listPublishedOrganisationSlugs } from '@/server/dal/organisations'
import { env } from '@/server/env'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const base = env.APP_URL.replace(/\/$/, '')
  const organisations = await listPublishedOrganisationSlugs()
  const fixed = [routes.home, routes.pricing, routes.about, routes.contact, routes.terms, routes.privacy, routes.refundPolicy, routes.cookies]
  return [
    ...fixed.map((path) => ({ url: `${base}${path}` })),
    ...organisations.map((o) => ({ url: `${base}${routes.orgPage(o.type, o.slug)}`, lastModified: o.updatedAt })),
  ]
}
