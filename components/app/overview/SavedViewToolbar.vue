<script setup lang="ts">
import {
  CalendarDays,
  ChevronDown,
  LayoutTemplate,
  Plus,
  SlidersHorizontal,
} from "lucide-vue-next";
import type { SavedViewListItem } from "~/types/saved-view";

defineProps<{
  savedViewId: string;
  views: SavedViewListItem[];
  dashboardId: string;
  dashboards: { id: string; name: string }[];
  range: 4 | 7 | 0;
  rangeOptions: readonly { id: 4 | 7 | 0; label: string }[];
  hasSavedView: boolean;
  currentName: string;
  loading?: boolean;
  error?: string | null;
}>();

defineEmits<{
  "update:savedViewId": [value: string];
  "update:dashboardId": [value: string];
  "update:range": [value: 4 | 7 | 0];
  layout: [];
  addWidget: [];
  customDashboard: [];
}>();
</script>

<template>
  <SurfaceCard variant="frame" padding="sm" class="border border-black/[0.06]">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(8rem,0.6fr)]">
        <div class="min-w-0">
          <label class="sv-section-title">Saved view</label>
          <div class="relative mt-1.5">
            <select
              :value="savedViewId"
              class="app-control appearance-none pr-10 text-[14px]"
              @change="$emit('update:savedViewId', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Default dashboard</option>
              <option v-for="view in views" :key="view.id" :value="view.id">
                {{ view.name }}
              </option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" :stroke-width="1.9" />
          </div>
          <p v-if="loading" class="mt-1.5 text-[11px] text-black/45">Loading views...</p>
          <p v-else-if="error" class="mt-1.5 text-[11px] text-red-700">{{ error }}</p>
        </div>

        <div class="min-w-0">
          <label class="sv-section-title">Dashboard / view name</label>
          <div class="mt-1.5 rounded-[var(--sv-radius-control)] border border-black/[0.08] bg-black/[0.015] px-4 py-3">
            <p class="truncate text-[14px] font-semibold text-black/78">{{ currentName }}</p>
          </div>
        </div>

        <div class="min-w-0">
          <label class="sv-section-title">Date range</label>
          <div class="relative mt-1.5">
            <CalendarDays class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" :stroke-width="1.9" />
            <select
              :value="range"
              class="app-control appearance-none pl-10 pr-10 text-[14px]"
              @change="$emit('update:range', Number(($event.target as HTMLSelectElement).value) as 4 | 7 | 0)"
            >
              <option v-for="option in rangeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" :stroke-width="1.9" />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button v-if="!hasSavedView" type="button" class="app-button button-secondary text-sm" @click="$emit('layout')">
          <SlidersHorizontal class="h-4 w-4" :stroke-width="1.9" />
          Layout
        </button>
        <button v-if="!hasSavedView" type="button" class="app-button button-secondary text-sm" @click="$emit('addWidget')">
          <Plus class="h-4 w-4" :stroke-width="1.9" />
          Add widget
        </button>
        <button v-if="!hasSavedView" type="button" class="app-button button-secondary text-sm" @click="$emit('customDashboard')">
          <LayoutTemplate class="h-4 w-4" :stroke-width="1.9" />
          Custom dashboard
        </button>
      </div>
    </div>
  </SurfaceCard>
</template>
