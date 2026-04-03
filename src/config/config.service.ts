import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BusinessConfig as PrismaBusinessConfig,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BUSINESS_CONFIG_SINGLETON_ID,
  getBusinessTypePreset,
  getDefaultBusinessConfigCreateInput,
  mergeBusinessModules,
  readBusinessModules,
  toBusinessModulesJson,
} from './config.defaults';
import { UpdateBusinessConfigDto } from './dto/update-business-config.dto';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.ensureConfigExists();
    return this.mapConfig(config);
  }

  async updateConfig(dto: UpdateBusinessConfigDto, updatedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.ensureConfigExists(tx);
      const currentModules = readBusinessModules(current.modules);
      const nextBusinessType = dto.businessType ?? current.businessType;
      const businessTypeChanged =
        dto.businessType !== undefined && dto.businessType !== current.businessType;

      let nextModules = currentModules;

      if (businessTypeChanged && dto.applyPreset === true) {
        const presetModules = getBusinessTypePreset(nextBusinessType);
        if (presetModules) {
          nextModules = presetModules;
        }
      }

      nextModules = mergeBusinessModules(nextModules, dto.modules);

      const updated = await tx.businessConfig.update({
        where: { id: BUSINESS_CONFIG_SINGLETON_ID },
        data: {
          ...(dto.businessName !== undefined
            ? {
                businessName: this.normalizeRequiredText(
                  dto.businessName,
                  'businessName',
                ),
              }
            : {}),
          ...(dto.legalName !== undefined
            ? { legalName: this.normalizeOptionalText(dto.legalName) }
            : {}),
          ...(dto.businessType !== undefined
            ? { businessType: dto.businessType }
            : {}),
          ...(dto.currencyCode !== undefined
            ? {
                currencyCode: this.normalizeRequiredText(
                  dto.currencyCode,
                  'currencyCode',
                ).toUpperCase(),
              }
            : {}),
          ...(dto.timezone !== undefined
            ? {
                timezone: this.normalizeRequiredText(dto.timezone, 'timezone'),
              }
            : {}),
          ...(dto.countryCode !== undefined
            ? {
                countryCode: this.normalizeRequiredText(
                  dto.countryCode,
                  'countryCode',
                ).toUpperCase(),
              }
            : {}),
          ...(dto.email !== undefined
            ? { email: this.normalizeOptionalText(dto.email) }
            : {}),
          ...(dto.phone !== undefined
            ? { phone: this.normalizeOptionalText(dto.phone) }
            : {}),
          ...(dto.address !== undefined
            ? { address: this.normalizeOptionalText(dto.address) }
            : {}),
          modules: toBusinessModulesJson(nextModules),
          updatedById,
        },
      });

      return this.mapConfig(updated);
    });
  }

  private async ensureConfigExists(
    client: PrismaClientLike = this.prisma,
  ): Promise<PrismaBusinessConfig> {
    const existing = await client.businessConfig.findUnique({
      where: { id: BUSINESS_CONFIG_SINGLETON_ID },
    });

    if (existing) {
      return existing;
    }

    try {
      return await client.businessConfig.create({
        data: getDefaultBusinessConfigCreateInput(),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return client.businessConfig.findUniqueOrThrow({
          where: { id: BUSINESS_CONFIG_SINGLETON_ID },
        });
      }

      throw error;
    }
  }

  private mapConfig(config: PrismaBusinessConfig) {
    return {
      id: config.id,
      businessName: config.businessName,
      legalName: config.legalName,
      businessType: config.businessType,
      currencyCode: config.currencyCode,
      timezone: config.timezone,
      countryCode: config.countryCode,
      email: config.email,
      phone: config.phone,
      address: config.address,
      modules: readBusinessModules(config.modules),
      updatedById: config.updatedById,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }
}
