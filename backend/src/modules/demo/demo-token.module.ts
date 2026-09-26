import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { AppConfig } from '../../config/configuration';
import { DemoTokenService } from './demo-token.service';

/**
 * Always registered (the realtime gateway asks it to verify handshakes), but
 * inert unless demo mode is on. Without JWT_SECRET a per-process secret is
 * used, so demo tokens simply die with the process.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { demo } = configService.get<AppConfig>('app')!;
        return {
          secret: demo.tokenSecret || randomBytes(32).toString('base64'),
          signOptions: { expiresIn: demo.tokenExpiresIn },
        };
      },
    }),
  ],
  providers: [DemoTokenService],
  exports: [DemoTokenService],
})
export class DemoTokenModule {}
