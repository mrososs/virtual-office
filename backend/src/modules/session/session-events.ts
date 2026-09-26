import { Injectable } from '@nestjs/common';
import { Subject, type Observable } from 'rxjs';
import type { SessionEndedEvent } from './session.types';

/**
 * Session lifecycle notifications. The realtime gateway listens so a
 * signed-out or expired session cannot keep a socket (and office presence)
 * alive; nothing here depends on the gateway.
 */
@Injectable()
export class SessionEvents {
  private readonly ended = new Subject<SessionEndedEvent>();

  readonly ended$: Observable<SessionEndedEvent> = this.ended.asObservable();

  emitEnded(event: SessionEndedEvent): void {
    this.ended.next(event);
  }
}
