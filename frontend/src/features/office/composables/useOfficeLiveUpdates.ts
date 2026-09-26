import { SOCKET_EVENTS, type WorkSnapshot } from '@virtual-office/shared';
import { onBeforeUnmount, watch } from 'vue';

import { httpClient } from '@/core/api';
import { socketClient } from '@/core/socket';
import { useSignOut } from '@/features/auth/composables/useSignOut';
import { applyDynamicState } from '@/features/office/data/apply-office-snapshot';
import { resolveOfficeDataSource } from '@/features/office/data/office-data-source';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';
import { useWorkStore } from '@/stores/work.store';

/**
 * Production only (demo mode has its scripted simulation): keeps the stores
 * in step with the server over the office socket.
 *
 *   employee:presence_changed → who is connected (presence, never activity)
 *   employee:activity_changed → Activity Engine results (Azure DevOps today)
 *   work:synced               → refetch work items / PRs / builds over HTTP
 *   session:ended             → back to /login
 *
 * After a reconnect the whole dynamic state is reloaded, because events sent
 * while offline were missed — the office never keeps showing a stale picture
 * as if it were current.
 */
export function useOfficeLiveUpdates() {
  const employeeStore = useEmployeeStore();
  const workStore = useWorkStore();
  const officeStore = useOfficeStore();
  const authStore = useAuthStore();
  const { signOut } = useSignOut();

  let hasConnected = false;

  async function refreshWork(): Promise<void> {
    try {
      const work = await httpClient.get<WorkSnapshot>('/work');
      workStore.setAll(work);
    } catch {
      // The next work:synced or reconnect resync will try again.
    }
  }

  async function resync(): Promise<void> {
    try {
      const snapshot = await (await resolveOfficeDataSource(false)).load();
      applyDynamicState(snapshot);
      for (const profile of snapshot.avatarProfiles) employeeStore.upsertAvatarProfile(profile);
    } catch {
      // Still unreachable: the Disconnected banner stays until the next successful reconnect.
    }
  }

  const unsubscribers = [
    socketClient.on(SOCKET_EVENTS.EMPLOYEE_PRESENCE_CHANGED, ({ employeeId, presence }) => employeeStore.setPresence(employeeId, presence)),
    socketClient.on(SOCKET_EVENTS.EMPLOYEE_ACTIVITY_CHANGED, ({ employeeId, activity }) => employeeStore.setActivity(employeeId, activity, null)),
    socketClient.on(SOCKET_EVENTS.WORK_SYNCED, () => {
      void refreshWork();
      // A sync may have found this employee's token expired or fixed: refresh the top-bar hint.
      void authStore.refreshIntegrations();
    }),
    socketClient.on(SOCKET_EVENTS.SESSION_ENDED, () => void signOut('sessionEnded')),
    // A refused handshake that will not be retried usually means the session is gone: confirm before leaving.
    socketClient.onConnectError((error, willRetry) => {
      if (willRetry || error.message !== 'unauthorized') return;
      void authStore.restore().then((me) => {
        if (!me && authStore.status === 'anonymous') void signOut('sessionEnded');
      });
    }),
  ];

  watch(
    () => officeStore.realtimeStatus,
    (status) => {
      if (status !== 'connected') return;
      if (hasConnected) void resync();
      hasConnected = true;
    },
  );

  onBeforeUnmount(() => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  });
}
