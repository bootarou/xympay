/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `Product` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Add the uuid column as optional
ALTER TABLE "Product" ADD COLUMN "uuid" TEXT;

-- Step 2: Populate existing rows with unique UUIDs using PostgreSQL's uuid_generate_v4() function
UPDATE "Product" SET "uuid" = uuid_generate_v4()::text WHERE "uuid" IS NULL;

-- Step 3: Make the uuid column NOT NULL
ALTER TABLE "Product" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX "Product_uuid_key" ON "Product"("uuid");
