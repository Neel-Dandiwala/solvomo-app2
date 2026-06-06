<script setup lang="ts">
definePageMeta({ layout: "app" });
await navigateTo("/app", { replace: true });
</script>

<template>
  <p class="p-6 text-[13px] text-black/50">Redirecting…</p>
</template>
