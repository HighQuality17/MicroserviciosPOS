import { Transform, Type } from 'class-transformer';
import { BusinessType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const isDefined = (_object: unknown, value: unknown) => value !== undefined;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimUppercase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateBusinessConfigModulesDto {
  @ValidateIf(isDefined)
  @IsBoolean()
  ingredients?: boolean;

  @ValidateIf(isDefined)
  @IsBoolean()
  recipes?: boolean;

  @ValidateIf(isDefined)
  @IsBoolean()
  combos?: boolean;

  @ValidateIf(isDefined)
  @IsBoolean()
  priceLists?: boolean;

  @ValidateIf(isDefined)
  @IsBoolean()
  fiscalFields?: boolean;

  @ValidateIf(isDefined)
  @IsBoolean()
  electronicInvoicing?: boolean;
}

export class UpdateBusinessConfigDto {
  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(160)
  legalName?: string | null;

  @ValidateIf(isDefined)
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ValidateIf(isDefined)
  @Transform(trimUppercase)
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @ValidateIf(isDefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  timezone?: string;

  @ValidateIf(isDefined)
  @Transform(trimUppercase)
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ValidateIf(isDefined)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateBusinessConfigModulesDto)
  modules?: UpdateBusinessConfigModulesDto;

  @ValidateIf(isDefined)
  @IsBoolean()
  applyPreset?: boolean;
}
