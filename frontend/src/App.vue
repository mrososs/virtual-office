<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppProviders from '@/app/providers/AppProviders.vue';
import { resolveLayout } from '@/app/layouts/resolveLayout';
import PwaHost from '@/features/pwa/components/PwaHost.vue';

const route = useRoute();
const layout = computed(() => resolveLayout(route.meta.layout));
</script>

<template>
  <AppProviders>
    <component :is="layout" />
    <PwaHost />
  </AppProviders>
</template>
