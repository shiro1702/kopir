import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prefer direct (unpooled) URL for migrate; fall back to pooled DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED || env('DATABASE_URL'),
  },
})
