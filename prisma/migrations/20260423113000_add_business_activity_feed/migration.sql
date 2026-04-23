-- CreateEnum
CREATE TYPE "BusinessActivityType" AS ENUM (
    'CASH_OPENED',
    'CASH_CLOSED',
    'SALE_COMPLETED',
    'STOCK_MOVEMENT'
);

-- CreateEnum
CREATE TYPE "BusinessActivityEntityType" AS ENUM (
    'CASH_SESSION',
    'SALE',
    'INGREDIENT_MOVEMENT'
);

-- AlterTable
ALTER TABLE "CashSession"
ADD COLUMN "closedById" INTEGER;

-- CreateTable
CREATE TABLE "CashClosureSnapshot" (
    "id" SERIAL NOT NULL,
    "cashSessionId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "locationName" TEXT NOT NULL,
    "openedById" INTEGER NOT NULL,
    "openedByName" TEXT NOT NULL,
    "closedById" INTEGER NOT NULL,
    "closedByName" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "openingCash" DECIMAL(65,30) NOT NULL,
    "cashSalesTotal" DECIMAL(65,30) NOT NULL,
    "transferSalesTotal" DECIMAL(65,30) NOT NULL,
    "totalChangeGiven" DECIMAL(65,30) NOT NULL,
    "closingCashExpected" DECIMAL(65,30) NOT NULL,
    "closingCashCounted" DECIMAL(65,30) NOT NULL,
    "difference" DECIMAL(65,30) NOT NULL,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashClosureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessActivity" (
    "id" SERIAL NOT NULL,
    "eventKey" TEXT NOT NULL,
    "type" "BusinessActivityType" NOT NULL,
    "entityType" "BusinessActivityEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actorUserId" INTEGER,
    "actorUserName" TEXT,
    "locationId" INTEGER,
    "locationName" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "detailJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashClosureSnapshot_cashSessionId_key" ON "CashClosureSnapshot"("cashSessionId");

-- CreateIndex
CREATE INDEX "CashClosureSnapshot_closedAt_idx" ON "CashClosureSnapshot"("closedAt");

-- CreateIndex
CREATE INDEX "CashClosureSnapshot_locationId_closedAt_idx" ON "CashClosureSnapshot"("locationId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessActivity_eventKey_key" ON "BusinessActivity"("eventKey");

-- CreateIndex
CREATE INDEX "BusinessActivity_occurredAt_idx" ON "BusinessActivity"("occurredAt");

-- CreateIndex
CREATE INDEX "BusinessActivity_type_occurredAt_idx" ON "BusinessActivity"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "BusinessActivity_entityType_entityId_idx" ON "BusinessActivity"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "CashSession"
ADD CONSTRAINT "CashSession_closedById_fkey"
FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosureSnapshot"
ADD CONSTRAINT "CashClosureSnapshot_cashSessionId_fkey"
FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
