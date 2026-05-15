/*
  Warnings:

  - You are about to drop the column `type` on the `MaxRecord` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `MaxRecord` table. All the data in the column will be lost.
  - Added the required column `category` to the `MaxRecord` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MaxRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movement" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "details" TEXT,
    "weight" REAL,
    "reps" INTEGER,
    "distance" REAL,
    "timeSeconds" INTEGER,
    "notes" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaxRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MaxRecord" ("createdAt", "date", "id", "movement", "notes", "userId") SELECT "createdAt", "date", "id", "movement", "notes", "userId" FROM "MaxRecord";
DROP TABLE "MaxRecord";
ALTER TABLE "new_MaxRecord" RENAME TO "MaxRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
