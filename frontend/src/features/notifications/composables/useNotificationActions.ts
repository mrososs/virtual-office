import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useTeamsActions } from '@/features/teams/composables/useTeamsActions';
import type { NotificationAction } from '@/features/notifications/notification.types';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

/** Resolves a notification's action into UI/world commands. Producers only describe intent. */
export function useNotificationActions() {
  const uiStore = useUiStore();
  const roomStore = useRoomStore();
  const { walkTo, focusEmployee } = useOfficeCommands();
  const teams = useTeamsActions();

  function run(action: NotificationAction): void {
    switch (action.kind) {
      case 'WALK_TO_ROOM':
        walkTo({ kind: 'ROOM', roomId: action.roomId }, `Walking to ${roomStore.byId(action.roomId)?.name ?? 'the room'}`);
        return;
      case 'OPEN_MEETING':
        uiStore.select({ kind: 'meeting', id: action.meetingId });
        return;
      case 'OPEN_EMPLOYEE':
        void focusEmployee(action.employeeId);
        return;
      case 'TEAMS_GROUP_CALL':
        teams.startGroupCall(action.roomId);
        return;
    }
  }

  return { run };
}
