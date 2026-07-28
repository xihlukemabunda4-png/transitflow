import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('routes')
export class RoutesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.route.findMany();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: { stops: { include: { stop: true }, orderBy: { sequence: 'asc' } } },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }
}
