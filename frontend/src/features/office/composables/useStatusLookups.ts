import type { Employee } from '@virtual-office/shared';

import { formatStatusLine, type StatusLookups } from '@/features/office/status-line';
import { useMeetingStore } from '@/stores/meeting.store';
import { useWorkStore } from '@/stores/work.store';

/** Store-backed lookups for `formatStatusLine`, shared by the director and UI lists. */
export function useStatusLookups() {
  const workStore = useWorkStore();
  const meetingStore = useMeetingStore();

  const lookups: StatusLookups = {
    workItem: (id) => workStore.workItem(id),
    pullRequest: (id) => workStore.pullRequest(id),
    build: (id) => workStore.build(id),
    meeting: (id) => (id ? meetingStore.byId(id) : undefined),
  };

  return {
    lookups,
    statusLineOf: (employee: Employee) => formatStatusLine(employee, lookups),
  };
}
