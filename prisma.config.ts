import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Local development reads .env.local. On the VM and in CI the variables are already in the environment.
config({ path: '.env.local', quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --conditions=react-server prisma/seed.ts',
  },
  datasource: {
    // Migrations and the seed run as the schema owner. The application itself uses DATABASE_URL.
    url: process.env['DATABASE_URL_OWNER'] ?? process.env['DATABASE_URL'],
  },
})
