-- Prisma @updatedAt is maintained by the application and must not have a database default.
ALTER TABLE "species" ALTER COLUMN "updatedAt" DROP DEFAULT;