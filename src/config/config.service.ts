import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BusinessConfig as PrismaBusinessConfig,
  Prisma,
} from '@prisma/client';
import { BusinessActivityService } from '../business-activity/business-activity.service';
import type { ConfigUpdatedFieldChange } from '../business-activity/business-activity.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  BUSINESS_CONFIG_SINGLETON_ID,
  getBusinessTypePreset,
  getDefaultBusinessConfigCreateInput,
  mergeBusinessModules,
  readBusinessModules,
  toBusinessModulesJson,
} from './config.defaults';
import type { BusinessModules } from './config.defaults';
import { UpdateBusinessConfigDto } from './dto/update-business-config.dto';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
type ConfigAuditField =
  | 'businessName'
  | 'legalName'
  | 'businessType'
  | 'currencyCode'
  | 'timezone'
  | 'countryCode'
  | 'email'
  | 'phone'
  | 'address'
  | 'modules';

interface ConfigSnapshot {
  businessName: string;
  legalName: string | null;
  businessType: PrismaBusinessConfig['businessType'];
  currencyCode: string;
  timezone: string;
  countryCode: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  modules: BusinessModules;
}

const CONFIG_AUDIT_FIELDS: Array<{
  field: ConfigAuditField;
  label: string;
}> = [
  { field: 'businessName', label: 'Nombre del negocio' },
  { field: 'legalName', label: 'Razon social' },
  { field: 'businessType', label: 'Tipo de negocio' },
  { field: 'currencyCode', label: 'Moneda' },
  { field: 'timezone', label: 'Zona horaria' },
  { field: 'countryCode', label: 'Pais' },
  { field: 'email', label: 'Email' },
  { field: 'phone', label: 'Telefono' },
  { field: 'address', label: 'Direccion' },
  { field: 'modules', label: 'Modulos activos' },
];

@Injectable()
export class ConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessActivityService: BusinessActivityService,
  ) {}

  async getConfig() {
    const config = await this.ensureConfigExists();
    return this.mapConfig(config);
  }

  async getAudit() {
    return this.businessActivityService.getFeed(1, 8, {
      category: 'CONFIG',
    });
  }

  async updateConfig(dto: UpdateBusinessConfigDto, updatedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.ensureConfigExists(tx);
      const currentModules = readBusinessModules(current.modules);
      const currentSnapshot = this.createSnapshot(current, currentModules);
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

      const nextSnapshot: ConfigSnapshot = {
        businessName:
          dto.businessName !== undefined
            ? this.normalizeRequiredText(dto.businessName, 'businessName')
            : current.businessName,
        legalName:
          dto.legalName !== undefined
            ? this.normalizeOptionalText(dto.legalName)
            : current.legalName,
        businessType: nextBusinessType,
        currencyCode:
          dto.currencyCode !== undefined
            ? this.normalizeRequiredText(
                dto.currencyCode,
                'currencyCode',
              ).toUpperCase()
            : current.currencyCode,
        timezone:
          dto.timezone !== undefined
            ? this.normalizeRequiredText(dto.timezone, 'timezone')
            : current.timezone,
        countryCode:
          dto.countryCode !== undefined
            ? this.normalizeRequiredText(dto.countryCode, 'countryCode').toUpperCase()
            : current.countryCode,
        email:
          dto.email !== undefined
            ? this.normalizeOptionalText(dto.email)
            : current.email,
        phone:
          dto.phone !== undefined
            ? this.normalizeOptionalText(dto.phone)
            : current.phone,
        address:
          dto.address !== undefined
            ? this.normalizeOptionalText(dto.address)
            : current.address,
        modules: nextModules,
      };
      const changes = this.getConfigChanges(currentSnapshot, nextSnapshot);

      if (changes.length === 0) {
        return this.mapConfig(current);
      }

      const updated = await tx.businessConfig.update({
        where: { id: BUSINESS_CONFIG_SINGLETON_ID },
        data: {
          businessName: nextSnapshot.businessName,
          legalName: nextSnapshot.legalName,
          businessType: nextSnapshot.businessType,
          currencyCode: nextSnapshot.currencyCode,
          timezone: nextSnapshot.timezone,
          countryCode: nextSnapshot.countryCode,
          email: nextSnapshot.email,
          phone: nextSnapshot.phone,
          address: nextSnapshot.address,
          modules: toBusinessModulesJson(nextSnapshot.modules),
          updatedById,
        },
      });

      const responsible = await tx.user.findUnique({
        where: { id: updatedById },
        select: { id: true, name: true },
      });

      await this.businessActivityService.recordConfigUpdated(tx, {
        config_id: updated.id,
        changed_at: updated.updatedAt,
        responsible: responsible ?? {
          id: updatedById,
          name: `Usuario #${updatedById}`,
        },
        changes,
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

  private createSnapshot(
    config: PrismaBusinessConfig,
    modules: BusinessModules,
  ): ConfigSnapshot {
    return {
      businessName: config.businessName,
      legalName: config.legalName,
      businessType: config.businessType,
      currencyCode: config.currencyCode,
      timezone: config.timezone,
      countryCode: config.countryCode,
      email: config.email,
      phone: config.phone,
      address: config.address,
      modules,
    };
  }

  private getConfigChanges(
    before: ConfigSnapshot,
    after: ConfigSnapshot,
  ): ConfigUpdatedFieldChange[] {
    return CONFIG_AUDIT_FIELDS.reduce<ConfigUpdatedFieldChange[]>(
      (changes, item) => {
        const beforeValue = this.getAuditValue(item.field, before);
        const afterValue = this.getAuditValue(item.field, after);

        if (!this.auditValuesEqual(beforeValue, afterValue)) {
          changes.push({
            field: item.field,
            label: item.label,
            before: beforeValue,
            after: afterValue,
          });
        }

        return changes;
      },
      [],
    );
  }

  private getAuditValue(field: ConfigAuditField, snapshot: ConfigSnapshot) {
    if (field === 'modules') {
      return {
        ingredients: snapshot.modules.ingredients,
        recipes: snapshot.modules.recipes,
        combos: snapshot.modules.combos,
        priceLists: snapshot.modules.priceLists,
        fiscalFields: snapshot.modules.fiscalFields,
        electronicInvoicing: snapshot.modules.electronicInvoicing,
      };
    }

    return snapshot[field];
  }

  private auditValuesEqual(
    before: ConfigUpdatedFieldChange['before'],
    after: ConfigUpdatedFieldChange['after'],
  ) {
    if (typeof before === 'object' || typeof after === 'object') {
      return JSON.stringify(before) === JSON.stringify(after);
    }

    return before === after;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }
}
