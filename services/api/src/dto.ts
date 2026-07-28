import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class AccessibilityDto {
  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;

  @IsOptional()
  @IsBoolean()
  largeText?: boolean;

  @IsOptional()
  @IsBoolean()
  wheelchairOnly?: boolean;
}

export class FavoriteDto {
  @IsString()
  routeId!: string;
}

export class CreateRouteDto {
  @IsString()
  shortName!: string;

  @IsString()
  longName!: string;

  @IsString()
  color!: string;

  /** JSON-encoded array of {lat,lng} points — see docs/05-database-schema.md note. */
  @IsString()
  polyline!: string;

  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  longName?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  polyline?: string;

  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;
}

export class CreateStopDto {
  @IsString()
  name!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;
}

export class UpdateStopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;
}

export class CreateVehicleDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsNumber()
  capacitySeated?: number;

  @IsOptional()
  @IsNumber()
  capacityStanding?: number;

  @IsOptional()
  @IsNumber()
  wheelchairSpaces?: number;

  @IsOptional()
  @IsNumber()
  bicycleSpaces?: number;

  @IsOptional()
  @IsIn(['OFF_DUTY', 'ON_ROUTE', 'DELAYED', 'OUT_OF_SERVICE'])
  status?: string;
}

export class RedeemPointsDto {
  @IsInt()
  @IsPositive()
  points!: number;
}

export class EmergencyContactDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;
}

export class SosAlertDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateTripShareDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  destinationStopId?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  hours?: number;
}

export class LostFoundReportDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  routeId?: string;
}

export class TopUpDto {
  @IsInt()
  @IsPositive()
  amountCents!: number;
}

const PASS_TYPES = ['SINGLE', 'WEEKLY', 'MONTHLY', 'STUDENT', 'SENIOR', 'FAMILY'];

export class PurchaseTicketDto {
  @IsIn(PASS_TYPES)
  passType!: string;
}

export class IncidentReportDto {
  @IsIn(['BREAKDOWN', 'ACCIDENT', 'DELAY', 'ROAD_CLOSURE', 'OTHER'])
  type!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ServiceAlertDto {
  @IsString()
  routeId!: string;

  @IsString()
  message!: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsIn(['OFF_DUTY', 'ON_ROUTE', 'DELAYED', 'OUT_OF_SERVICE'])
  status?: string;

  @IsOptional()
  @IsNumber()
  mileageKm?: number;

  @IsOptional()
  @IsNumber()
  nextServiceDueKm?: number;
}

export class LogServiceDto {
  @IsOptional()
  @IsNumber()
  nextServiceDueKm?: number;
}
