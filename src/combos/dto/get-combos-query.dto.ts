import { IsEnum, IsOptional } from 'class-validator';

export enum ComboListStatus {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class GetCombosQueryDto {
  @IsEnum(ComboListStatus)
  @IsOptional()
  status?: ComboListStatus;
}
