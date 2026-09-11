-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SHELTER');

-- CreateEnum
CREATE TYPE "PetGender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "PetAdoptionStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ADOPTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "ageYears" INTEGER,
    "ageMonths" INTEGER,
    "gender" "PetGender" NOT NULL DEFAULT 'UNKNOWN',
    "size" "PetSize" NOT NULL DEFAULT 'MEDIUM',
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goodWithChildren" BOOLEAN NOT NULL DEFAULT false,
    "goodWithDogs" BOOLEAN NOT NULL DEFAULT false,
    "goodWithCats" BOOLEAN NOT NULL DEFAULT false,
    "vaccinated" BOOLEAN NOT NULL DEFAULT false,
    "neutered" BOOLEAN NOT NULL DEFAULT false,
    "houseTrained" BOOLEAN NOT NULL DEFAULT false,
    "adoptionStatus" "PetAdoptionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "photoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shelters_name_key" ON "shelters"("name");
