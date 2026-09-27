import { Injectable } from '@nestjs/common';
import { checkExternalInvite, findGameProvider, type ExternalInviteCheck } from '@virtual-office/shared';

/**
 * The one gate every external room link passes before the office stores or
 * hands it out — whether a host pasted it or a provider API returned it.
 * Rules live with each provider in the shared catalog (`GAME_PROVIDERS`);
 * unknown providers are always rejected.
 */
@Injectable()
export class ExternalGameUrlValidator {
  validate(providerId: string, input: unknown): ExternalInviteCheck {
    const provider = findGameProvider(providerId);
    if (!provider) return { ok: false, reason: 'This table has no game provider.' };
    return checkExternalInvite(provider, input);
  }
}
