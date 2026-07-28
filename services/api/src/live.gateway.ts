import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { ServiceAlert, VehiclePosition } from '@transitflow/types';
import { SimulationService } from './simulation.service';

@WebSocketGateway({ namespace: '/live', cors: { origin: '*' } })
export class LiveGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly sim: SimulationService) {}

  afterInit(): void {
    this.sim.onPosition((pos: VehiclePosition) => {
      const routeId = this.sim.getVehicleRouteId(pos.vehicleId);
      if (!routeId) return;
      this.server.to(`route:${routeId}`).emit('vehicle:position', pos);
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { routeId: string }): void {
    client.join(`route:${body.routeId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { routeId: string }): void {
    client.leave(`route:${body.routeId}`);
  }

  broadcastAlert(alert: ServiceAlert): void {
    this.server.to(`route:${alert.routeId}`).emit('service:alert', alert);
  }
}
