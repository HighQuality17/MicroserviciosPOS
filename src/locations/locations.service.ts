import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateLocationDto) {
    try {
      return await this.prisma.location.create({
        data: { name: dto.name.trim() },
      });
    } catch {
      throw new ConflictException('Location name already exists');
    }
  }
}
