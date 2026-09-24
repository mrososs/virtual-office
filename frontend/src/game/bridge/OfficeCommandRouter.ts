import { GAME_EVENTS, type GameEventPayloadMap } from './GameEvents';
import { gameBridge } from './GameBridge';

type CommandName =
  | typeof GAME_EVENTS.OFFICE_INIT
  | typeof GAME_EVENTS.RESET_OFFICE
  | typeof GAME_EVENTS.SET_EMPLOYEE_STATUS
  | typeof GAME_EVENTS.MOVE_EMPLOYEE
  | typeof GAME_EVENTS.SET_ROOM_MEETING
  | typeof GAME_EVENTS.SET_SELECTION
  | typeof GAME_EVENTS.FOCUS_EMPLOYEE
  | typeof GAME_EVENTS.FOCUS_ROOM
  | typeof GAME_EVENTS.RECENTER_CAMERA
  | typeof GAME_EVENTS.SET_ZOOM
  | typeof GAME_EVENTS.NAVIGATE_LOCAL_PLAYER
  | typeof GAME_EVENTS.CANCEL_LOCAL_NAVIGATION;

export type OfficeCommandHandlers = {
  [K in CommandName]: (payload: GameEventPayloadMap[K]) => void;
};

/**
 * Phaser-side subscriber for every Vue -> Phaser command. A failing handler
 * surfaces as GAME_ERROR (rendered by Vue) instead of an uncaught exception
 * inside whichever Vue call site happened to emit the command.
 */
export class OfficeCommandRouter {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(private readonly handlers: OfficeCommandHandlers) {}

  attach(): void {
    for (const event of Object.keys(this.handlers) as CommandName[]) this.listen(event);
  }

  detach(): void {
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
  }

  private listen<K extends CommandName>(event: K): void {
    const handler = (payload: GameEventPayloadMap[K]) => {
      try {
        this.handlers[event](payload);
      } catch (error) {
        console.error(`[office] command ${event} failed`, error);
        gameBridge.emit(GAME_EVENTS.GAME_ERROR, { message: error instanceof Error ? error.message : String(error) });
      }
    };
    gameBridge.on(event, handler);
    this.unsubscribers.push(() => gameBridge.off(event, handler));
  }
}
