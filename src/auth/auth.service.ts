import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  ThemePreference,
  defaultThemePreference,
  resolveThemePreference,
} from './theme-preference.constants';

interface AuthUserRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'AUDITOR';
  themePreference: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    if (!dto.email && !dto.username) {
      throw new BadRequestException('Debe enviar email o username');
    }

    const user = await this.prisma.user.findFirst({
      where: dto.email
        ? { email: dto.email.trim().toLowerCase() }
        : { username: dto.username!.trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await this.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  async me(userId: number) {
    const user = await this.findAuthenticatedUser(userId);
    return this.mapAuthenticatedUser(user);
  }

  async updateThemePreference(userId: number, theme: ThemePreference) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { themePreference: theme },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          themePreference: true,
        },
      });

      return this.mapAuthenticatedUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new UnauthorizedException('Usuario autenticado no encontrado');
      }

      throw error;
    }
  }

  private async findAuthenticatedUser(userId: number): Promise<AuthUserRecord> {
    const users = await this.prisma.$queryRaw<AuthUserRecord[]>`
      SELECT
        "id",
        "name",
        "username",
        "email",
        "role",
        COALESCE("themePreference", ${defaultThemePreference}) AS "themePreference"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `;

    const user = users[0];
    if (!user) {
      throw new UnauthorizedException('Usuario autenticado no encontrado');
    }

    return user;
  }

  private mapAuthenticatedUser(user: AuthUserRecord) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      themePreference: resolveThemePreference(user.themePreference),
    };
  }

  private async comparePassword(
    plainPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    try {
      return await compare(plainPassword, passwordHash);
    } catch {
      return false;
    }
  }
}
