<script setup lang="ts">
import type { ProfileBadgeKind } from "~/types/app-shell";

const props = defineProps<{
  kind: ProfileBadgeKind;
}>();

const label = computed(() => (props.kind === "playground" ? "PG" : "Prod"));
const title = computed(() => (props.kind === "playground" ? "Playground" : "Production"));
</script>

<template>
  <span
    class="env-badge inline-flex items-center justify-center rounded-lg px-2 py-1 text-[11px] font-bold tracking-[0.04em]"
    :class="kind === 'playground' ? 'env-badge--playground' : 'env-badge--production'"
    :title="title"
  >
    {{ label }}
  </span>
</template>
