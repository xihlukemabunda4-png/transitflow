import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { DispatchController } from './dispatch.controller';
import { DriverController } from './driver.controller';
import { LiveGateway } from './live.gateway';
import { MeController } from './me.controller';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { PrismaService } from './prisma.service';
import { RoutesController } from './routes.controller';
import { SimulationService } from './simulation.service';
import { StopsController } from './stops.controller';
import { TripShareController } from './trip-share.controller';
import { VehiclesController } from './vehicles.controller';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-only-transitflow-secret-change-me',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [
    AppController,
    RoutesController,
    StopsController,
    VehiclesController,
    PlanController,
    AuthController,
    MeController,
    AdminController,
    WalletController,
    DriverController,
    DispatchController,
    TripShareController,
  ],
  providers: [PrismaService, SimulationService, LiveGateway, PlanService],
})
export class AppModule {}
