<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppProviders from '@/app/providers/AppProviders.vue';
import { resolveLayout } from '@/app/layouts/resolveLayout';

const route = useRoute();
const layout = computed(() => resolveLayout(route.meta.layout));
</script>

<template>
  <AppProviders>
    <component :is="layout" />
  </AppProviders>
</template>
