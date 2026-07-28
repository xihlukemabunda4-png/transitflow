import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  @Get()
  async list(@Query('routeId') routeId?: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: routeId ? { routeId } : undefined,
    });
    return vehicles.map((v) => ({
      ...v,
      position: this.sim.getLatestPosition(v.id) ?? null,
    }));
  }
}
