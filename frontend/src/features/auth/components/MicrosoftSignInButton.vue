<script setup lang="ts">
/** Microsoft's sign-in button: the four-square mark + "Sign in with Microsoft" (Microsoft identity branding guidance). */
defineProps<{ busy?: boolean }>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-line/15 bg-white px-4 text-[14px] font-semibold text-[#5e5e5e] shadow-sm transition-colors hover:bg-[#f3f3f3] disabled:cursor-wait disabled:opacity-60"
    :disabled="busy"
    @click="$emit('click')"
  >
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
    {{ busy ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft' }}
  </button>
</template>
