<script setup lang="ts">
/**
 * Opens the provider-supplied join URL (Teams, …) in a new tab. It never
 * builds a URL, never embeds the call, and never turns on mic/camera —
 * joining is always an explicit click that hands off to the provider.
 */
import type { Meeting } from '@virtual-office/shared';
import { ExternalLink } from 'lucide-vue-next';
import { computed } from 'vue';

import { BaseButton } from '@/shared/components';

const props = defineProps<{ meeting: Meeting }>();

const joinable = computed(() => !!props.meeting.joinUrl && (props.meeting.status === 'LIVE' || props.meeting.status === 'STARTING_SOON'));

function join(): void {
  if (props.meeting.joinUrl) window.open(props.meeting.joinUrl, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <div class="space-y-2">
    <BaseButton variant="primary" block :disabled="!joinable" @click="join">
      <ExternalLink :size="14" /> Join in Microsoft Teams
    </BaseButton>
    <p v-if="!meeting.joinUrl" class="text-2xs leading-relaxed text-subtle">
      Demo meeting — there is no real Teams link. Live meetings open the join URL supplied by Microsoft Graph.
    </p>
    <p v-else class="text-2xs leading-relaxed text-subtle">Opens Teams in a new tab. Your camera and microphone stay off until you turn them on there.</p>
  </div>
</template>
