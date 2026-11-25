import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Audit('AUTH_LOGIN', { targetType: 'AUTH' })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Audit('AUTH_LOGOUT', { targetType: 'AUTH' })
  logout(): { success: true } {
    return this.authService.logout();
  }
}
