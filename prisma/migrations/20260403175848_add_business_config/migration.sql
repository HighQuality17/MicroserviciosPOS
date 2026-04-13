-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('DESSERT_SHOP', 'CAFE', 'RESTAURANT', 'RETAIL', 'MINIMARKET', 'SALON', 'CUSTOM');

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL,
    "legalName" TEXT,
    "businessType" "BusinessType" NOT NULL DEFAULT 'DESSERT_SHOP',
    "currencyCode" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "countryCode" TEXT NOT NULL DEFAULT 'CO',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "modules" JSONB NOT NULL,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessConfig_singleton_id_check" CHECK ("id" = 1)
);

-- SeedDefaultSingleton
INSERT INTO "BusinessConfig" (
    "id",
    "businessName",
    "businessType",
    "currencyCode",
    "timezone",
    "countryCode",
    "modules",
    "createdAt",
    "updatedAt"
) VALUES (
    1,
    'Registry POS',
    'DESSERT_SHOP',
    'COP',
    'America/Bogota',
    'CO',
    '{"ingredients":true,"recipes":true,"combos":true,"priceLists":false,"fiscalFields":false,"electronicInvoicing":false}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- AddForeignKey
ALTER TABLE "BusinessConfig" ADD CONSTRAINT "BusinessConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
