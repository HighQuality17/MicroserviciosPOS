-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CASHIER', 'ADMIN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('WEIGHT', 'VOLUME', 'COUNT');

-- CreateEnum
CREATE TYPE "IngredientMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "IngredientMovementReasonCode" AS ENUM ('PURCHASE', 'INITIAL_LOAD', 'SUPPLIER_RETURN', 'POSITIVE_ADJUSTMENT', 'WASTE', 'DAMAGE', 'INTERNAL_USE', 'EXPIRATION', 'NEGATIVE_ADJUSTMENT', 'PHYSICAL_COUNT', 'ADMIN_CORRECTION');

-- CreateEnum
CREATE TYPE "IngredientMovementReferenceType" AS ENUM ('MANUAL', 'SALE');

-- CreateEnum
CREATE TYPE "VatType" AS ENUM ('ZERO', 'EXEMPT', 'FIVE', 'NINETEEN', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('TAXED', 'EXEMPT', 'EXCLUDED', 'NOT_SUBJECT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIANT');

-- CreateEnum
CREATE TYPE "SaleItemType" AS ENUM ('VARIANT', 'COMBO');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "themePreference" TEXT NOT NULL DEFAULT 'midnight-indigo',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "factorToBase" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "defaultUnitCode" TEXT NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientStock" (
    "ingredientId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "qtyOnHandBase" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "IngredientStock_pkey" PRIMARY KEY ("ingredientId","locationId")
);

-- CreateTable
CREATE TABLE "IngredientMovement" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "type" "IngredientMovementType" NOT NULL,
    "qtyBase" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "referenceType" "IngredientMovementReferenceType",
    "refSaleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "reasonCode" "IngredientMovementReasonCode",
    "supportDocument" TEXT,
    "unitCostAtTime" DECIMAL(65,30),
    "batchNumber" TEXT,
    "previousStock" DECIMAL(65,30),
    "newStock" DECIMAL(65,30),
    "countedStock" DECIMAL(65,30),

    CONSTRAINT "IngredientMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT,
    "barcode" TEXT,
    "supplierReference" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'SIMPLE',
    "unspscCode" TEXT,
    "vatType" "VatType",
    "taxCategory" "TaxCategory",
    "unitMeasure" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "applyInc" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "salePrice" DECIMAL(65,30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "salePrice" DECIMAL(65,30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" SERIAL NOT NULL,
    "comboId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantRecipeItem" (
    "variantId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "qtyBaseRequired" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VariantRecipeItem_pkey" PRIMARY KEY ("variantId","ingredientId")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "openedBy" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingCash" DECIMAL(65,30) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closingCashExpected" DECIMAL(65,30),
    "closingCashCounted" DECIMAL(65,30),

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "cashSessionId" INTEGER NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "itemType" "SaleItemType" NOT NULL,
    "refId" INTEGER NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "lineTotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountReceived" DECIMAL(65,30) NOT NULL,
    "amountApplied" DECIMAL(65,30) NOT NULL,
    "changeGiven" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_code_key" ON "UnitType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "IngredientMovement_locationId_createdAt_idx" ON "IngredientMovement"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "IngredientMovement_ingredientId_createdAt_idx" ON "IngredientMovement"("ingredientId", "createdAt");

-- CreateIndex
CREATE INDEX "IngredientMovement_referenceType_refSaleId_idx" ON "IngredientMovement"("referenceType", "refSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_internalCode_key" ON "Product"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Combo_name_key" ON "Combo"("name");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_defaultUnitCode_fkey" FOREIGN KEY ("defaultUnitCode") REFERENCES "UnitType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientStock" ADD CONSTRAINT "IngredientStock_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientStock" ADD CONSTRAINT "IngredientStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_refSaleId_fkey" FOREIGN KEY ("refSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantRecipeItem" ADD CONSTRAINT "VariantRecipeItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantRecipeItem" ADD CONSTRAINT "VariantRecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

