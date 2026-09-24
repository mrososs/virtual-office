import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivityEngine } from './activity-engine.service';
import { ActivityResolver } from './activity-resolver';
import {
  ACTIVITY_RESOLUTION_STRATEGY,
  DefaultActivityResolutionStrategy,
} from './activity-resolution-strategy';

/**
 * Presence and Activity are separate concepts (see `modules/presence`):
 * this module owns "what is the employee doing", never "are they connected".
 */
@Module({
  controllers: [ActivitiesController],
  providers: [
    ActivityEngine,
    ActivityResolver,
    {
      provide: ACTIVITY_RESOLUTION_STRATEGY,
      useClass: DefaultActivityResolutionStrategy,
    },
  ],
  exports: [ActivityEngine, ActivityResolver],
})
export class ActivitiesModule {}
