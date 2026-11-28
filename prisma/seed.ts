// Seeds reference data, default settings and plans. Safe to run again: existing rows are left as they are, so
// staff edits survive. Run with `npm run db:seed` (needs DATABASE_URL_OWNER).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' }
import { PrismaClient } from '../src/generated/prisma/client'
import { gameSkills, industries, leagues, plans, positions, qualifications, softSkills } from './data/reference'

const url = process.env.DATABASE_URL_OWNER ?? process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_OWNER is not set')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

interface StripePlanIds {
  [key: string]: { productId: string; priceId: string }
}

/** Real Stripe ids written by scripts/stripe/setup.ts (prisma/data/plans.<mode>.json). Optional. */
function loadStripeIds(): StripePlanIds {
  for (const file of ['plans.live.json', 'plans.test.json']) {
    const path = join(process.cwd(), 'prisma', 'data', file)
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as StripePlanIds
  }
  return {}
}

async function seedCountries() {
  countries.registerLocale(en)
  const names = countries.getNames('en', { select: 'official' })
  const rows = Object.entries(names).map(([code, name]) => ({ code, name }))
  await prisma.country.createMany({ data: rows, skipDuplicates: true })
  return rows.length
}

async function seedPlans() {
  const ids = loadStripeIds()
  for (const plan of plans) {
    const stripe = ids[plan.key]
    const productId = stripe?.productId ?? `unconfigured_${plan.key}`
    const priceId = stripe?.priceId ?? `unconfigured_${plan.key}`
    const existing = await prisma.plan.findUnique({ where: { key: plan.key }, include: { prices: true } })
    if (!existing) {
      const created = await prisma.plan.create({
        data: {
          key: plan.key,
          name: plan.name,
          organisationType: plan.organisationType,
          interval: plan.interval,
          stripeProductId: productId,
          sortOrder: plan.sortOrder,
          prices: { create: { stripePriceId: priceId, amountPence: plan.amountPence } },
        },
        include: { prices: true },
      })
      await prisma.plan.update({ where: { id: created.id }, data: { currentPriceId: created.prices[0]!.id } })
      continue
    }
    // Replace placeholder ids once the Stripe setup script has run
    if (stripe && existing.stripeProductId.startsWith('unconfigured_')) {
      await prisma.plan.update({ where: { id: existing.id }, data: { stripeProductId: productId } })
      const placeholder = existing.prices.find((p) => p.stripePriceId.startsWith('unconfigured_'))
      if (placeholder) await prisma.planPrice.update({ where: { id: placeholder.id }, data: { stripePriceId: priceId } })
    }
  }
}

async function seedSettings() {
  const defaults: Record<string, unknown> = {
    'email.fromName': 'Offload',
    'email.fromAddress': process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@offloadagency.com',
    'support.email': process.env.EMAIL_FROM_ADDRESS ?? 'support@offloadagency.com',
    'terms.version': '1',
    'terms.updatedAt': new Date().toISOString(),
  }
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as never } })
  }
}

async function main() {
  const countryCount = await seedCountries()
  await prisma.position.createMany({
    data: positions.map((p, i) => ({ id: p.id, label: p.label, sortOrder: i + 1 })),
    skipDuplicates: true,
  })
  await prisma.skill.createMany({
    data: [
      ...softSkills.map((s, i) => ({ id: s.id, label: s.label, kind: 'SOFT' as const, sortOrder: i + 1 })),
      ...gameSkills.map((s, i) => ({ id: s.id, label: s.label, kind: 'GAME' as const, sortOrder: i + 1 })),
    ],
    skipDuplicates: true,
  })
  await prisma.qualification.createMany({
    data: qualifications.map((q, i) => ({ id: q.id, label: q.label, sortOrder: i + 1 })),
    skipDuplicates: true,
  })
  await prisma.league.createMany({
    data: leagues.map((l, i) => ({ id: l.id, name: l.name, country: l.country, sortOrder: i + 1 })),
    skipDuplicates: true,
  })
  await prisma.industry.createMany({
    data: industries.map((x, i) => ({ id: x.id, label: x.label, sortOrder: i + 1 })),
    skipDuplicates: true,
  })
  await seedPlans()
  await seedSettings()
  console.log(
    `Seeded: ${countryCount} countries, ${positions.length} positions, ${softSkills.length + gameSkills.length} skills, ` +
      `${qualifications.length} qualifications, ${leagues.length} leagues, ${industries.length} industries, ${plans.length} plans.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
