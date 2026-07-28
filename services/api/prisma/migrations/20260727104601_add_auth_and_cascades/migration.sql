/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RouteStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "distanceFromStartM" REAL NOT NULL,
    CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RouteStop" ("distanceFromStartM", "id", "routeId", "sequence", "stopId") SELECT "distanceFromStartM", "id", "routeId", "sequence", "stopId" FROM "RouteStop";
DROP TABLE "RouteStop";
ALTER TABLE "new_RouteStop" RENAME TO "RouteStop";
CREATE INDEX "RouteStop_routeId_sequence_idx" ON "RouteStop"("routeId", "sequence");
CREATE UNIQUE INDEX "RouteStop_routeId_stopId_key" ON "RouteStop"("routeId", "stopId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'RIDER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "role") SELECT "createdAt", "displayName", "email", "id", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
