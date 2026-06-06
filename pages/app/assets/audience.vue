<script setup lang="ts">
definePageMeta({ layout: "app" });
useHead({ title: "Audience assets — Solvomo" });
</script>

<template>
  <AssetLibraryScreen
    kind="audience"
    title="Audience assets"
    description="Targeting definitions saved in Solvomo — not imported platform audience libraries."
    empty-label="No audience assets yet. Save from Simulation or create manually."
  />
</template>
