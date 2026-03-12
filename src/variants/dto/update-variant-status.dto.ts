import { IsBoolean } from 'class-validator';

export class UpdateVariantStatusDto {
  @IsBoolean()
  active!: boolean;
}
