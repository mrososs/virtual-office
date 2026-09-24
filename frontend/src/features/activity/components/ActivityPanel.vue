<script setup lang="ts">
import OfficeSidePanel from '@/features/office/components/OfficeSidePanel.vue';

import ActivityFeed from './ActivityFeed.vue';
</script>

<template>
  <OfficeSidePanel title="Activity" subtitle="Work, meetings and builds across the office">
    <div class="p-1.5">
      <ActivityFeed />
    </div>
  </OfficeSidePanel>
</template>
