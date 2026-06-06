<script setup lang="ts">
import { LayoutDashboard, Plus, WandSparkles } from "lucide-vue-next";

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    showActions?: boolean;
  }>(),
  {
    title: "This view is empty.",
    description: "Add widgets manually or ask AI to build this view.",
    showActions: false,
  },
);

defineEmits<{
  addWidget: [];
  askAi: [];
}>();
</script>

<template>
  <div class="rounded-[1.5rem] border border-dashed border-black/12 bg-black/[0.015] px-6 py-10 text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-black/38">
      <LayoutDashboard class="h-5 w-5" :stroke-width="1.9" />
    </div>
    <h3 class="mt-4 text-[1.05rem] font-semibold tracking-[-0.025em] text-black">
      {{ title }}
    </h3>
    <p class="mx-auto mt-2 max-w-md text-[14px] leading-6 text-black/55">
      {{ description }}
    </p>
    <div v-if="showActions" class="mt-6 flex flex-wrap justify-center gap-2">
      <button type="button" class="app-button button-secondary text-sm" @click="$emit('addWidget')">
        <Plus class="h-4 w-4" :stroke-width="1.9" />
        Add widget
      </button>
      <button type="button" class="app-button button-primary text-sm" @click="$emit('askAi')">
        <WandSparkles class="h-4 w-4" :stroke-width="1.9" />
        Ask AI
      </button>
    </div>
  </div>
</template>
