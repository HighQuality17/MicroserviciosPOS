import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { UpdateThemePreferenceDto } from './dto/update-theme-preference.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/theme')
  updateThemePreference(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateThemePreferenceDto,
  ) {
    return this.authService.updateThemePreference(user.sub, dto.theme);
  }
}