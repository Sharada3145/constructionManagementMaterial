import { defineConfig } from '@prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: {
    kind: 'single',
    filePath: 'prisma/schema.prisma',
  },
  migrate: {
    connection: {
      url: process.env.DATABASE_URL,
    }
  }
})
