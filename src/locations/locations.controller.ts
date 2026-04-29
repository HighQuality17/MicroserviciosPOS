import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateLocationStatusDto } from './dto/update-location-status.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  findAll(
    @Query() query: GetLocationsQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.locationsService.findAll({
      status: query.status,
      canSeeInactive: user?.role === UserRole.ADMIN,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationStatusDto,
  ) {
    return this.locationsService.updateStatus(id, dto);
  }
}
