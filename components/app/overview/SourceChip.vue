<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-semibold text-black/68 shadow-[0_10px_24px_-28px_rgba(15,23,42,0.2)]">
    <span class="h-1.5 w-1.5 rounded-full bg-[rgba(91,123,225,0.75)]" />
    {{ label }}
  </span>
</template>
