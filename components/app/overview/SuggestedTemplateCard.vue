<script setup lang="ts">
import { BarChart3, Gauge, LineChart, Sparkles } from "lucide-vue-next";
import type { DashboardTemplateSuggestion } from "~/types/saved-view";

defineProps<{
  template: DashboardTemplateSuggestion;
  busy?: boolean;
}>();

defineEmits<{
  use: [templateId: string];
}>();
</script>

<template>
  <button
    type="button"
    class="group flex h-full flex-col rounded-[1.35rem] border border-black/[0.07] bg-white p-4 text-left shadow-[0_22px_56px_-48px_rgba(15,23,42,0.36)] transition hover:-translate-y-0.5 hover:border-black/14 hover:shadow-[0_28px_64px_-46px_rgba(15,23,42,0.4)] disabled:cursor-wait disabled:opacity-70"
    :disabled="busy"
    @click="$emit('use', template.id)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="rounded-2xl border border-black/[0.06] bg-black/[0.025] p-2.5">
        <LineChart v-if="template.categories.length > 1" class="h-4.5 w-4.5 text-black/55" :stroke-width="1.9" />
        <Gauge v-else-if="template.categories[0] === 'ads'" class="h-4.5 w-4.5 text-black/55" :stroke-width="1.9" />
        <BarChart3 v-else class="h-4.5 w-4.5 text-black/55" :stroke-width="1.9" />
      </div>
      <span class="inline-flex items-center gap-1 rounded-full bg-[rgba(91,123,225,0.07)] px-2 py-1 text-[11px] font-semibold text-[rgba(55,70,130,0.86)]">
        <Sparkles class="h-3 w-3" :stroke-width="2" />
        AI scoped
      </span>
    </div>
    <h3 class="mt-4 text-[15px] font-semibold tracking-[-0.025em] text-black">
      {{ template.title }}
    </h3>
    <p class="mt-2 min-h-[2.6rem] text-[12.5px] leading-5 text-black/55">
      {{ template.description }}
    </p>
    <div class="mt-4 flex flex-wrap gap-1.5">
      <SourceChip
        v-for="chip in (template.source_chips?.length ? template.source_chips : template.connection_slugs)"
        :key="chip"
        :label="chip"
      />
    </div>
    <div class="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-3">
      <span class="text-[12px] font-medium text-black/45">
        {{ template.metric_count || template.metric_keys?.length || 0 }} suggested metrics
      </span>
      <span class="text-[12px] font-semibold text-black/75 group-hover:text-black">
        Use template
      </span>
    </div>
  </button>
</template>
