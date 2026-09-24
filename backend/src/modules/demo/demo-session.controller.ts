import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { AuthService } from '../auth/auth.service';
import { CreateDemoSessionDto, DemoSessionResponseDto } from './dto/create-demo-session.dto';

/**
 * Issues a short-lived platform token for a demo identity WITHOUT credentials.
 * Only reachable when DemoModule is registered (DEMO_MODE=true, non-production);
 * production auth (`AuthService.login`, `JwtAuthGuard`) is untouched.
 */
@Controller('demo')
export class DemoSessionController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('session')
  createSession(@Body() dto: CreateDemoSessionDto): DemoSessionResponseDto {
    const { auth } = this.configService.get<AppConfig>('app')!;
    const accessToken = this.authService.signToken({
      sub: `demo:${dto.employeeId}`,
      organizationId: dto.organizationId,
      email: `${dto.employeeId}@demo.local`,
      employeeId: dto.employeeId,
      demo: true,
    });

    return {
      accessToken,
      employeeId: dto.employeeId,
      organizationId: dto.organizationId,
      expiresIn: auth.jwtExpiresIn,
    };
  }
}
