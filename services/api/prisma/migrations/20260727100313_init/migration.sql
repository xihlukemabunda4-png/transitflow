-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortName" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "polyline" TEXT NOT NULL,
    "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "distanceFromStartM" REAL NOT NULL,
    CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "routeId" TEXT,
    "capacitySeated" INTEGER NOT NULL DEFAULT 40,
    "capacityStanding" INTEGER NOT NULL DEFAULT 20,
    "wheelchairSpaces" INTEGER NOT NULL DEFAULT 2,
    "bicycleSpaces" INTEGER NOT NULL DEFAULT 2,
    "source" TEXT NOT NULL DEFAULT 'SIMULATED',
    "status" TEXT NOT NULL DEFAULT 'OFF_DUTY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehiclePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "heading" REAL NOT NULL,
    "speedKph" REAL NOT NULL,
    "occupancy" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehiclePosition_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'RIDER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AccessibilityPrefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "largeText" BOOLEAN NOT NULL DEFAULT false,
    "wheelchairOnly" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AccessibilityPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FavoriteRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    CONSTRAINT "FavoriteRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RouteStop_routeId_sequence_idx" ON "RouteStop"("routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_stopId_key" ON "RouteStop"("routeId", "stopId");

-- CreateIndex
CREATE INDEX "VehiclePosition_vehicleId_recordedAt_idx" ON "VehiclePosition"("vehicleId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilityPrefs_userId_key" ON "AccessibilityPrefs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoute_userId_routeId_key" ON "FavoriteRoute"("userId", "routeId");
