import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DemoSessionController } from './demo-session.controller';

/**
 * Local-development demo identity support. Registered from AppModule via
 * `ConditionalModule.registerWhen(..., isDemoModeEnabled)` so it simply does
 * not exist unless DEMO_MODE=true and NODE_ENV is not production.
 */
@Module({
  imports: [AuthModule],
  controllers: [DemoSessionController],
})
export class DemoModule implements OnModuleInit {
  private readonly logger = new Logger(DemoModule.name);

  onModuleInit(): void {
    this.logger.warn('DEMO MODE ENABLED — POST /api/demo/session issues tokens without credentials. Never enable in production.');
  }
}
