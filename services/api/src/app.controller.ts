import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const routeCount = await this.prisma.route.count();
    return {
      status: 'ok',
      service: 'transitflow-api',
      timestamp: new Date().toISOString(),
      db: { connected: true, routes: routeCount },
    };
  }
}
