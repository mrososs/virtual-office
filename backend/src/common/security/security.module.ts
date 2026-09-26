import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/** Global so auth, integrations and repositories share one set of derived keys. */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class SecurityModule {}
