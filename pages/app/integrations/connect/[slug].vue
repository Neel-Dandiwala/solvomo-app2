<script setup lang="ts">
/**
 * Legacy connect slug route — main integrations directory is `/app/integrations`.
 */
definePageMeta({ layout: "app" });

await navigateTo("/app/connections", { replace: true });
</script>

<template>
  <p class="p-6 text-[13px] text-black/50">
    Redirecting…
  </p>
</template>
