import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PlanService } from './plan.service';

function parseLatLng(value: string | undefined, paramName: string): { lat: number; lng: number } {
  if (!value) throw new BadRequestException(`Missing "${paramName}" query param (expected "lat,lng")`);
  const [lat, lng] = value.split(',').map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new BadRequestException(`Invalid "${paramName}" query param (expected "lat,lng")`);
  }
  return { lat, lng };
}

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  plan(@Query('from') from?: string, @Query('to') to?: string) {
    return this.planService.plan(parseLatLng(from, 'from'), parseLatLng(to, 'to'));
  }
}
