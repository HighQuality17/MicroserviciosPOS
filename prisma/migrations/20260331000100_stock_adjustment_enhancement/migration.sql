ALTER TABLE "IngredientMovement" ADD COLUMN "referenceType" TEXT;
ALTER TABLE "IngredientMovement" ADD COLUMN "reasonCode" TEXT;
ALTER TABLE "IngredientMovement" ADD COLUMN "supportDocument" TEXT;
ALTER TABLE "IngredientMovement" ADD COLUMN "unitCostAtTime" DECIMAL;
ALTER TABLE "IngredientMovement" ADD COLUMN "batchNumber" TEXT;
ALTER TABLE "IngredientMovement" ADD COLUMN "previousStock" DECIMAL;
ALTER TABLE "IngredientMovement" ADD COLUMN "newStock" DECIMAL;
ALTER TABLE "IngredientMovement" ADD COLUMN "countedStock" DECIMAL;

UPDATE "IngredientMovement"
SET "type" = CASE "type"
  WHEN 'IN' THEN 'ENTRY'
  WHEN 'OUT' THEN 'EXIT'
  WHEN 'ADJUST' THEN 'ADJUSTMENT'
  ELSE "type"
END;

UPDATE "IngredientMovement"
SET "referenceType" = CASE
  WHEN "refSaleId" IS NOT NULL THEN 'SALE'
  ELSE 'MANUAL'
END
WHERE "referenceType" IS NULL;

CREATE INDEX "IngredientMovement_locationId_createdAt_idx"
ON "IngredientMovement" ("locationId", "createdAt");

CREATE INDEX "IngredientMovement_ingredientId_createdAt_idx"
ON "IngredientMovement" ("ingredientId", "createdAt");

CREATE INDEX "IngredientMovement_referenceType_refSaleId_idx"
ON "IngredientMovement" ("referenceType", "refSaleId");
