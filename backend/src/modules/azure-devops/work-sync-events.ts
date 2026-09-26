import { Injectable } from '@nestjs/common';
import type { WorkSyncedPayload } from '@virtual-office/shared';
import { Subject, type Observable } from 'rxjs';

/** "A fresh Azure DevOps snapshot is stored" — the realtime gateway tells clients to refetch work data. */
@Injectable()
export class WorkSyncEvents {
  private readonly synced = new Subject<WorkSyncedPayload>();

  readonly synced$: Observable<WorkSyncedPayload> = this.synced.asObservable();

  emitSynced(payload: WorkSyncedPayload): void {
    this.synced.next(payload);
  }
}
