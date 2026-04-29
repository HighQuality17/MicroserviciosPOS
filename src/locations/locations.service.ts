import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationStatusFilter } from './dto/get-locations-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateLocationStatusDto } from './dto/update-location-status.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({
    status,
    canSeeInactive,
  }: {
    status?: LocationStatusFilter;
    canSeeInactive: boolean;
  }) {
    const resolvedStatus = canSeeInactive ? status ?? 'ACTIVE' : 'ACTIVE';

    return this.prisma.location.findMany({
      where:
        resolvedStatus === 'ALL'
          ? undefined
          : { isActive: resolvedStatus === 'ACTIVE' },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateLocationDto) {
    try {
      return await this.prisma.location.create({
        data: { name: dto.name.trim(), isActive: true },
      });
    } catch (error) {
      this.handleLocationWriteError(error);
    }
  }

  async update(id: number, dto: UpdateLocationDto) {
    const name = dto.name?.trim();

    if (!name) {
      throw new BadRequestException('Debe enviar un nombre valido');
    }

    try {
      return await this.prisma.location.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      this.handleLocationWriteError(error);
    }
  }

  async updateStatus(id: number, dto: UpdateLocationStatusDto) {
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (!dto.isActive) {
      const openSession = await this.prisma.cashSession.findFirst({
        where: { locationId: id, closedAt: null },
        select: { id: true },
      });

      if (openSession) {
        throw new BadRequestException(
          'No se puede desactivar un punto de venta con caja abierta',
        );
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }

  private handleLocationWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Location name already exists');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Location not found');
      }
    }

    throw error;
  }
}
