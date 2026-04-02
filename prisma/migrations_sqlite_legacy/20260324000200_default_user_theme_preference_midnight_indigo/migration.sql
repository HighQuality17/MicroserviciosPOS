PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "themePreference" TEXT NOT NULL DEFAULT 'midnight-indigo'
);

INSERT INTO "new_User" ("id", "name", "username", "email", "passwordHash", "role", "themePreference")
SELECT
    "id",
    "name",
    "username",
    "email",
    "passwordHash",
    "role",
    COALESCE("themePreference", 'midnight-indigo')
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
