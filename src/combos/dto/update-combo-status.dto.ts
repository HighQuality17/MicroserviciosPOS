import { IsBoolean } from 'class-validator';

export class UpdateComboStatusDto {
  @IsBoolean()
  active!: boolean;
}
