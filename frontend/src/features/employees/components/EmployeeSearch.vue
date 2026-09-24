<script setup lang="ts">
import type { Employee } from '@virtual-office/shared';
import { Search } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue';

import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useClickOutside } from '@/shared/composables';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';

import EmployeeAvatar from './EmployeeAvatar.vue';
import EmployeeStatus from './EmployeeStatus.vue';

const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();
const { focusEmployee } = useOfficeCommands();

const query = shallowRef('');
const open = shallowRef(false);
const highlighted = shallowRef(0);
const root = useTemplateRef<HTMLElement>('root');
const input = useTemplateRef<HTMLInputElement>('input');

const results = computed<Employee[]>(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return employeeStore.all.slice(0, 6);
  return employeeStore.all
    .filter((employee) =>
      [employee.displayName, employee.jobTitle ?? '', officeStore.teamName(employee.teamId) ?? ''].some((field) => field.toLowerCase().includes(term)),
    )
    .slice(0, 8);
});

useClickOutside(root, open, () => (open.value = false));

function choose(employee: Employee | undefined): void {
  if (!employee) return;
  void focusEmployee(employee.id);
  query.value = '';
  open.value = false;
  input.value?.blur();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    highlighted.value = Math.min(results.value.length - 1, highlighted.value + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    highlighted.value = Math.max(0, highlighted.value - 1);
  } else if (event.key === 'Enter') {
    choose(results.value[highlighted.value]);
  } else if (event.key === 'Escape') {
    event.stopPropagation();
    query.value = '';
    open.value = false;
    input.value?.blur();
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  if (event.key === '/' && !typing) {
    event.preventDefault();
    input.value?.focus();
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
  <div ref="root" class="relative">
    <label class="flex h-8 w-[220px] items-center gap-2 rounded-lg border border-line/[0.08] bg-raised/80 px-2.5 text-muted transition-colors focus-within:border-accent/50 focus-within:bg-raised lg:w-[260px]">
      <Search :size="14" class="shrink-0" />
      <input
        ref="input"
        v-model="query"
        type="search"
        name="teammate-search"
        autocomplete="off"
        placeholder="Find a teammate…"
        aria-label="Find a teammate"
        class="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-subtle focus:outline-none"
        @focus="open = true"
        @input="highlighted = 0"
        @keydown="onKeydown"
      >
      <kbd class="vo-kbd">/</kbd>
    </label>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open" class="vo-panel absolute right-0 top-10 z-40 w-[320px] p-1.5 shadow-pop">
        <p class="vo-section-label px-2 pb-1 pt-1.5">{{ query ? 'Results' : 'People' }}</p>
        <ul v-if="results.length > 0" role="listbox">
          <li v-for="(employee, index) in results" :key="employee.id">
            <button
              type="button"
              role="option"
              :aria-selected="index === highlighted"
              class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors"
              :class="index === highlighted ? 'bg-hover' : 'hover:bg-hover/60'"
              @mouseenter="highlighted = index"
              @click="choose(employee)"
            >
              <EmployeeAvatar :employee="employee" size="sm" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium text-ink">{{ employee.displayName }}</span>
                <EmployeeStatus :employee="employee" />
              </span>
              <span class="shrink-0 text-2xs text-subtle">{{ employee.jobTitle }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="px-2 py-3 text-xs text-subtle">No one matches “{{ query }}”.</p>
      </div>
    </Transition>
  </div>
</template>
