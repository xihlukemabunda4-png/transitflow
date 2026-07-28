import { PrismaClient } from '@prisma/client';
import { cumulativeDistances, type LatLng } from '@transitflow/simulation';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Dev-only seeded admin — change or remove before any real deployment.
const ADMIN_EMAIL = 'admin@transitflow.dev';
const ADMIN_PASSWORD = 'admin12345';

// Fictional demo city, loosely centered on Johannesburg-ish coordinates.
// `polyline` is stored as a raw JSON array of [lat,lng] points rather than an
// encoded Google/Mapbox polyline string, to avoid an extra encode/decode
// dependency for the MVP — see docs/05-database-schema.md note.

interface StopSeed {
  name: string;
  lat: number;
  lng: number;
}

const route10Stops: StopSeed[] = [
  { name: 'Central Station', lat: -26.2041, lng: 28.0473 },
  { name: 'City Hall', lat: -26.2041, lng: 28.0533 },
  { name: 'Market Square', lat: -26.2001, lng: 28.0533 },
  { name: 'Museum District', lat: -26.1961, lng: 28.0533 },
  { name: 'Riverside Park', lat: -26.1961, lng: 28.0473 },
  { name: 'University', lat: -26.1961, lng: 28.0413 },
  { name: 'Stadium', lat: -26.2001, lng: 28.0413 },
  { name: 'Old Town', lat: -26.2041, lng: 28.0413 },
];

const route15Stops: StopSeed[] = [
  { name: 'Westgate Mall', lat: -26.2041, lng: 27.98 },
  { name: 'Riverbend', lat: -26.2041, lng: 28.0 },
  { name: 'Central Station', lat: -26.2041, lng: 28.0473 }, // interchange with route 10
  { name: 'Eastview', lat: -26.2041, lng: 28.09 },
  { name: 'Tech Park', lat: -26.2041, lng: 28.12 },
  { name: 'Airport Terminal', lat: -26.2041, lng: 28.16 },
];

async function upsertStop(s: StopSeed) {
  const existing = await prisma.stop.findFirst({ where: { name: s.name } });
  if (existing) return existing;
  return prisma.stop.create({ data: { name: s.name, lat: s.lat, lng: s.lng, wheelchairAccessible: true } });
}

async function seedRoute(shortName: string, longName: string, color: string, stopSeeds: StopSeed[], loop: boolean) {
  const stops = [];
  for (const s of stopSeeds) {
    stops.push(await upsertStop(s));
  }

  const points: LatLng[] = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
  const cumDistances = cumulativeDistances(loop ? [...points, points[0]] : points);

  const route = await prisma.route.create({
    data: {
      shortName,
      longName,
      color,
      polyline: JSON.stringify(loop ? [...points, points[0]] : points),
      wheelchairAccessible: true,
    },
  });

  for (let i = 0; i < stops.length; i++) {
    await prisma.routeStop.create({
      data: {
        routeId: route.id,
        stopId: stops[i].id,
        sequence: i,
        distanceFromStartM: cumDistances[i],
      },
    });
  }

  return route;
}

async function main() {
  console.log('Seeding demo data...');

  // Clear existing demo data (idempotent re-seed for local dev).
  await prisma.routeStop.deleteMany();
  await prisma.vehiclePosition.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.route.deleteMany();
  await prisma.stop.deleteMany();

  const route10 = await seedRoute('10', 'Downtown Loop', '#0EA36E', route10Stops, true);
  const route15 = await seedRoute('15', 'Crosstown', '#2563EB', route15Stops, false);

  await prisma.vehicle.createMany({
    data: [
      { label: 'BUS-010A', routeId: route10.id, source: 'SIMULATED', status: 'ON_ROUTE' },
      { label: 'BUS-010B', routeId: route10.id, source: 'SIMULATED', status: 'ON_ROUTE' },
      { label: 'BUS-015A', routeId: route15.id, source: 'SIMULATED', status: 'ON_ROUTE' },
      { label: 'BUS-015B', routeId: route15.id, source: 'SIMULATED', status: 'ON_ROUTE' },
    ],
  });

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, passwordHash: adminPasswordHash, displayName: 'Admin', role: 'ADMIN' },
    update: { passwordHash: adminPasswordHash, role: 'ADMIN' },
  });

  console.log('Seed complete:', { route10: route10.shortName, route15: route15.shortName, admin: ADMIN_EMAIL });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
