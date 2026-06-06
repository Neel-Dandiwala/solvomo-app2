<script setup lang="ts">
definePageMeta({ layout: "app" });
useHead({ title: "Datasource assets — Solvomo" });
</script>

<template>
  <AssetLibraryScreen
    kind="datasources"
    title="Datasource assets"
    description="Saved connection picks for simulations — which accounts power a scenario."
    empty-label="No datasource assets yet."
  />
</template>
