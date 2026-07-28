import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { FleetVehicle, Incident, SosAlert } from '@transitflow/types';
import { ServiceAlertDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LiveGateway } from './live.gateway';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

/** MVP simplification: any authenticated user can access dispatch, same as /driver. */
@Controller('dispatch')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
    private readonly gateway: LiveGateway,
  ) {}

  @Get('fleet')
  async fleet(): Promise<FleetVehicle[]> {
    const vehicles = await this.prisma.vehicle.findMany();
    return vehicles.map((v) => ({
      id: v.id,
      label: v.label,
      routeId: v.routeId,
      status: v.status as FleetVehicle['status'],
      position: this.sim.getLatestPosition(v.id) ?? null,
    }));
  }

  @Get('incidents')
  async incidents(@Query('open') open?: string): Promise<Incident[]> {
    const rows = await this.prisma.incident.findMany({
      where: open === 'true' ? { resolvedAt: null } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((i) => ({
      id: i.id,
      shiftId: i.shiftId,
      type: i.type as Incident['type'],
      description: i.description,
      resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  @Post('incidents/:id/resolve')
  async resolveIncident(@Param('id') id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    await this.prisma.incident.update({ where: { id }, data: { resolvedAt: new Date() } });
    return { ok: true };
  }

  @Post('alerts')
  broadcast(@Body() dto: ServiceAlertDto) {
    const alert = { routeId: dto.routeId, message: dto.message, createdAt: new Date().toISOString() };
    this.gateway.broadcastAlert(alert);
    return alert;
  }

  @Get('sos')
  async sosAlerts(@Query('open') open?: string): Promise<SosAlert[]> {
    const rows = await this.prisma.sosAlert.findMany({
      where: open === 'true' ? { resolvedAt: null } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      message: r.message,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Post('sos/:id/resolve')
  async resolveSos(@Param('id') id: string) {
    const alert = await this.prisma.sosAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('SOS alert not found');
    await this.prisma.sosAlert.update({ where: { id }, data: { resolvedAt: new Date() } });
    return { ok: true };
  }
}
