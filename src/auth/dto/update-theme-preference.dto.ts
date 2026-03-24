import { IsIn } from 'class-validator';
import {
  ThemePreference,
  themePreferenceValues,
} from '../theme-preference.constants';

export class UpdateThemePreferenceDto {
  @IsIn(themePreferenceValues)
  theme!: ThemePreference;
}