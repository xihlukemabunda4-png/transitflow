import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IncidentReportDto } from './dto';
import { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

interface AuthedRequest {
  user: JwtPayload;
}

/**
 * MVP simplification: any authenticated user can act as a driver (no
 * separate driver-signup flow or role check) — good enough to demo the
 * shift/incident mechanics end to end; a real deployment would gate this
 * behind role=DRIVER assigned by an admin.
 */
async function getOrCreateDriver(prisma: PrismaService, userId: string) {
  const existing = await prisma.driver.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.driver.create({ data: { userId } });
}

@Controller('driver')
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  @Post('shifts/start')
  async startShift(@Req() req: AuthedRequest, @Body('vehicleId') vehicleId: string) {
    if (!vehicleId) throw new BadRequestException('vehicleId is required');
    const driver = await getOrCreateDriver(this.prisma, req.user.sub);

    const active = await this.prisma.shift.findFirst({ where: { driverId: driver.id, endedAt: null } });
    if (active) throw new BadRequestException('You already have an active shift — end it first');

    const shift = await this.prisma.shift.create({ data: { driverId: driver.id, vehicleId } });
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ON_ROUTE' } });
    await this.sim.reload();
    return shift;
  }

  @Post('shifts/end')
  async endShift(@Req() req: AuthedRequest) {
    const driver = await getOrCreateDriver(this.prisma, req.user.sub);
    const active = await this.prisma.shift.findFirst({ where: { driverId: driver.id, endedAt: null } });
    if (!active) throw new BadRequestException('No active shift');

    await this.prisma.shift.update({ where: { id: active.id }, data: { endedAt: new Date() } });
    await this.prisma.vehicle.update({ where: { id: active.vehicleId }, data: { status: 'OFF_DUTY' } });
    await this.sim.reload();
    return { ok: true };
  }

  @Post('shifts/current/incidents')
  async reportIncident(@Req() req: AuthedRequest, @Body() dto: IncidentReportDto) {
    const driver = await getOrCreateDriver(this.prisma, req.user.sub);
    const active = await this.prisma.shift.findFirst({ where: { driverId: driver.id, endedAt: null } });
    if (!active) throw new BadRequestException('No active shift');

    if (dto.type !== 'DELAY') {
      await this.prisma.vehicle.update({ where: { id: active.vehicleId }, data: { status: 'DELAYED' } });
    }
    return this.prisma.incident.create({
      data: { shiftId: active.id, type: dto.type, description: dto.description },
    });
  }
}
