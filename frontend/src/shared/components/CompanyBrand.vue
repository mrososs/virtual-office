<script setup lang="ts">
import { shallowRef } from 'vue';

import { COMPANY_BRANDING } from '@/core/config/branding';

/**
 * Company identity for the app shell: logo, company name and a subtitle
 * (the product name by default). Everything comes from COMPANY_BRANDING; if
 * the logo cannot load, the name alone still identifies the company.
 */
withDefaults(defineProps<{ subtitle?: string | null; size?: 'sm' | 'md' }>(), { subtitle: undefined, size: 'sm' });

const logoFailed = shallowRef(false);
</script>

<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <img
      v-if="!logoFailed"
      :src="COMPANY_BRANDING.logoSource"
      :alt="`${COMPANY_BRANDING.companyName} logo`"
      class="w-auto shrink-0 object-contain"
      :class="size === 'md' ? 'h-7' : 'h-[18px]'"
      draggable="false"
      @error="logoFailed = true"
    >
    <div class="min-w-0 leading-tight">
      <p class="truncate font-semibold text-ink" :class="size === 'md' ? 'text-[15px]' : 'text-[13px]'">{{ COMPANY_BRANDING.companyName }}</p>
      <p v-if="subtitle !== null" class="truncate text-2xs text-subtle">{{ subtitle ?? COMPANY_BRANDING.productName }}</p>
    </div>
  </div>
</template>
