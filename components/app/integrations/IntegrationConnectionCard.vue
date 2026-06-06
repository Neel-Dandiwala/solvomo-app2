<script setup lang="ts">
import IntegrationLogo from "~/components/app/integrations/IntegrationLogo.vue";
import type { ConnectionsDirectoryItem } from "~/composables/useConnectionsTab";
import { directoryCategoryTags } from "~/utils/connectionCategories";

const props = defineProps<{
  item: ConnectionsDirectoryItem;
  logoSrc?: string;
  connectBusy?: boolean;
  deactivateBusy?: boolean;
  canConnect: boolean;
  canDeactivate: boolean;
  showSignInHint?: boolean;
}>();

const emit = defineEmits<{
  connect: [];
  deactivate: [];
}>();

const displayCategories = computed(() =>
  directoryCategoryTags(props.item.categories),
);
</script>

<template>
  <SurfaceCard
    variant="frame"
    padding="none"
    class="flex h-full flex-col overflow-hidden border"
    :class="item.is_active ? 'border-[rgba(91,123,225,0.35)] bg-[rgba(91,123,225,0.04)]' : 'border-black/[0.06]'"
  >
    <div class="flex flex-1 flex-col p-5 sm:p-6">
      <div class="flex gap-3.5">
        <IntegrationLogo class="shrink-0" :name="item.name" :logo-src="logoSrc" />
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 class="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-black">
              {{ item.name }}
            </h3>
            <StatusBadge
              v-if="item.is_active"
              variant="success"
              label="Active"
            />
          </div>
          <div v-if="displayCategories.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <span
              v-for="cat in displayCategories"
              :key="cat"
              class="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-black/60"
            >
              {{ cat }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      class="flex border-t border-black/[0.06] bg-black/[0.015] px-5 py-3.5 sm:px-6 sm:py-4"
    >
      <button
        v-if="canDeactivate"
        type="button"
        class="app-button button-secondary min-h-[2.75rem] w-full px-4 text-sm sm:w-auto"
        :disabled="deactivateBusy"
        @click="emit('deactivate')"
      >
        {{ deactivateBusy ? "Removing…" : "Deactivate" }}
      </button>
      <button
        v-else-if="canConnect"
        type="button"
        class="app-button button-primary min-h-[2.75rem] w-full px-4 text-sm text-white sm:w-auto"
        :disabled="connectBusy"
        @click="emit('connect')"
      >
        {{ connectBusy ? "Starting…" : "Connect" }}
      </button>
      <span
        v-else-if="showSignInHint"
        class="text-[12px] text-black/45"
      >Sign in to connect</span>
    </div>
  </SurfaceCard>
</template>
