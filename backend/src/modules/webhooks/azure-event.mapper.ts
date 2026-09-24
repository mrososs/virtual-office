import { Injectable } from '@nestjs/common';
import type { ActivitySignal, ActivityType } from '@virtual-office/shared';
import { AzureServiceHookEvent } from '../azure-devops/azure.types';

/**
 * Maps a raw Azure DevOps Service Hooks payload into a shared
 * `ActivitySignal`, ready for `ActivityEngine.ingestSignal`. Keeps the
 * webhook controller/service free of any knowledge of ActivitySignal
 * construction rules.
 */
@Injectable()
export class AzureEventMapper {
  private static readonly EVENT_TYPE_TO_ACTIVITY: Record<string, ActivityType> = {
    'workitem.updated': 'WORKING',
    'git.pullrequest.created': 'CODE_REVIEW',
    'git.pullrequest.updated': 'CODE_REVIEW',
    'build.complete': 'BUILDING',
  };

  toActivitySignal(event: AzureServiceHookEvent, employeeId: string): ActivitySignal | null {
    const type = AzureEventMapper.EVENT_TYPE_TO_ACTIVITY[event.eventType];
    if (!type) {
      // TODO: log/ignore unrecognized event types rather than silently dropping.
      return null;
    }

    // TODO: pull a real title/workItemId out of `event.resource` per eventType
    // (its shape varies by event — see AzureWorkItem/AzurePullRequest/AzureBuild).
    return {
      id: `azure-webhook-${event.eventType}-${Date.now()}`,
      employeeId,
      source: 'AZURE_DEVOPS',
      type,
      confidence: 0.6,
      occurredAt: new Date().toISOString(),
    };
  }
}
