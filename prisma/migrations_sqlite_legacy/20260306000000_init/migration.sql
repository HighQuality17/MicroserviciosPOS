PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL
);

CREATE TABLE "Location" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL
);

CREATE TABLE "UnitType" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "factorToBase" DECIMAL NOT NULL
);

CREATE TABLE "Ingredient" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "defaultUnitCode" TEXT NOT NULL,
  CONSTRAINT "Ingredient_defaultUnitCode_fkey"
    FOREIGN KEY ("defaultUnitCode") REFERENCES "UnitType" ("code")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IngredientStock" (
  "ingredientId" INTEGER NOT NULL,
  "locationId" INTEGER NOT NULL,
  "qtyOnHandBase" DECIMAL NOT NULL DEFAULT 0,
  PRIMARY KEY ("ingredientId", "locationId"),
  CONSTRAINT "IngredientStock_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IngredientStock_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IngredientMovement" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "ingredientId" INTEGER NOT NULL,
  "locationId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "qtyBase" DECIMAL NOT NULL,
  "reason" TEXT,
  "refSaleId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER NOT NULL,
  CONSTRAINT "IngredientMovement_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IngredientMovement_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IngredientMovement_refSaleId_fkey"
    FOREIGN KEY ("refSaleId") REFERENCES "Sale" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "IngredientMovement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Product" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "ProductVariant" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "productId" INTEGER NOT NULL,
  "size" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "salePrice" DECIMAL NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VariantRecipeItem" (
  "variantId" INTEGER NOT NULL,
  "ingredientId" INTEGER NOT NULL,
  "qtyBaseRequired" DECIMAL NOT NULL,
  PRIMARY KEY ("variantId", "ingredientId"),
  CONSTRAINT "VariantRecipeItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VariantRecipeItem_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CashSession" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "locationId" INTEGER NOT NULL,
  "openedBy" INTEGER NOT NULL,
  "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openingCash" DECIMAL NOT NULL,
  "closedAt" DATETIME,
  "closingCashExpected" DECIMAL,
  "closingCashCounted" DECIMAL,
  CONSTRAINT "CashSession_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CashSession_openedBy_fkey"
    FOREIGN KEY ("openedBy") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Sale" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "locationId" INTEGER NOT NULL,
  "cashierId" INTEGER NOT NULL,
  "cashSessionId" INTEGER NOT NULL,
  "subtotal" DECIMAL NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'NONE',
  "discountValue" DECIMAL NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL NOT NULL DEFAULT 0,
  "total" DECIMAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Sale_cashierId_fkey"
    FOREIGN KEY ("cashierId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Sale_cashSessionId_fkey"
    FOREIGN KEY ("cashSessionId") REFERENCES "CashSession" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "SaleItem" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "saleId" INTEGER NOT NULL,
  "itemType" TEXT NOT NULL,
  "refId" INTEGER NOT NULL,
  "qty" DECIMAL NOT NULL,
  "unitPrice" DECIMAL NOT NULL,
  "lineTotal" DECIMAL NOT NULL,
  CONSTRAINT "SaleItem_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "saleId" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "amountReceived" DECIMAL NOT NULL,
  "amountApplied" DECIMAL NOT NULL,
  "changeGiven" DECIMAL NOT NULL,
  CONSTRAINT "Payment_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadataJson" TEXT NOT NULL,
  CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");
CREATE UNIQUE INDEX "UnitType_code_key" ON "UnitType"("code");
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

PRAGMA foreign_keys=ON;
