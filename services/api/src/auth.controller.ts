import { Body, ConflictException, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResponse } from '@transitflow/types';
import { LoginDto, SignupDto } from './dto';
import { PrismaService } from './prisma.service';

const BCRYPT_ROUNDS = 10;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, displayName: dto.displayName },
    });
    return this.issueToken(user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user);
  }

  private async issueToken(user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  }): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role as AuthResponse['user']['role'] },
    };
  }
}
