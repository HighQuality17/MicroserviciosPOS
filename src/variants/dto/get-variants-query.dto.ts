import { IsEnum, IsOptional } from 'class-validator';

export enum VariantListStatus {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class GetVariantsQueryDto {
  @IsEnum(VariantListStatus)
  @IsOptional()
  status?: VariantListStatus;
}
