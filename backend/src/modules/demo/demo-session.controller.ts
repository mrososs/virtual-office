import { Body, Controller, Post } from '@nestjs/common';
import { DemoTokenService } from './demo-token.service';
import { CreateDemoSessionDto, DemoSessionResponseDto } from './dto/create-demo-session.dto';

/**
 * Issues a short-lived realtime token for a demo identity WITHOUT credentials.
 * Only reachable when DemoModule is registered (DEMO_MODE=true, non-production);
 * production sign-in (Microsoft Entra → session cookie) is untouched.
 */
@Controller('demo')
export class DemoSessionController {
  constructor(private readonly demoTokens: DemoTokenService) {}

  @Post('session')
  createSession(@Body() dto: CreateDemoSessionDto): DemoSessionResponseDto {
    return {
      accessToken: this.demoTokens.sign(dto.employeeId, dto.organizationId),
      employeeId: dto.employeeId,
      organizationId: dto.organizationId,
      expiresIn: this.demoTokens.tokenExpiresIn,
    };
  }
}
