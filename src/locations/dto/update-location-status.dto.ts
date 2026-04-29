import { IsBoolean } from 'class-validator';

export class UpdateLocationStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
