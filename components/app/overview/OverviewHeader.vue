<script setup lang="ts">
import { LayoutDashboard, Plus, Sparkles } from "lucide-vue-next";

defineProps<{
  sources: string[];
}>();
</script>

<template>
  <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <div class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-[12px] font-semibold text-black/55">
          <Sparkles class="h-3.5 w-3.5 text-[rgba(91,123,225,0.85)]" :stroke-width="1.9" />
          Dashboards
        </div>
        <h1 class="mt-4 text-[2.15rem] font-semibold leading-none tracking-[-0.055em] text-black sm:text-[2.55rem]">
          Dashboards
        </h1>
        <p class="mt-3 max-w-2xl text-[15px] leading-7 text-black/58">
          What happened? Build factual views from your connected data sources.
        </p>
        <div v-if="sources.length" class="mt-4 flex flex-wrap gap-2">
          <SourceChip v-for="source in sources" :key="source" :label="source" />
        </div>
        <p v-if="sources.length" class="mt-3 text-[12px] font-medium text-black/45">
          Templates are generated from your connected sources.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="app-button button-secondary text-sm" @click="$emit('addWidget')">
          <Plus class="h-4 w-4" :stroke-width="1.9" />
          Add widget
        </button>
        <NuxtLink to="/views/create" class="app-button button-primary text-sm">
          <LayoutDashboard class="h-4 w-4" :stroke-width="1.9" />
          Create view
        </NuxtLink>
      </div>
    </div>
  </SurfaceCard>
</template>
