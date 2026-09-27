import type { DeskEntity } from '@/game/entities/Desk';
import type { GameStationEntity } from '@/game/entities/GameStation';
import type { InteractiveObjectEntity } from '@/game/entities/InteractiveObject';
import type { RoomVisual } from '@/game/rooms/RoomVisual';
import type { InteractionSystem } from '@/game/systems/InteractionSystem';

/**
 * Wires InteractionSystem registrations for every static interactive entity
 * (desks, rooms, meeting screens, game stations) in one place, so OfficeScene
 * doesn't need to know the registration details for each entity type.
 * Avatars register themselves through EmployeeManager as they spawn.
 */
export class InteractionManager {
  constructor(private readonly interactionSystem: InteractionSystem) {}

  registerStatic(entities: { desks: DeskEntity[]; rooms: RoomVisual[]; furniture: InteractiveObjectEntity[]; stations: Iterable<GameStationEntity> }): void {
    for (const desk of entities.desks) this.interactionSystem.registerDesk(desk);
    for (const room of entities.rooms) this.interactionSystem.registerRoom(room);
    for (const item of entities.furniture) {
      if (item.isInteractive) this.interactionSystem.registerFurniture(item);
    }
    for (const station of entities.stations) this.interactionSystem.registerStation(station);
  }
}
