-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "internalCode" TEXT,
    "barcode" TEXT,
    "supplierReference" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'SIMPLE',
    "unspscCode" TEXT,
    "vatType" TEXT,
    "taxCategory" TEXT,
    "unitMeasure" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "applyInc" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Product" ("active", "applyInc", "id", "isService", "name", "taxCategory", "unitMeasure", "unspscCode", "vatType") SELECT "active", "applyInc", "id", "isService", "name", "taxCategory", "unitMeasure", "unspscCode", "vatType" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");
CREATE UNIQUE INDEX "Product_internalCode_key" ON "Product"("internalCode");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
