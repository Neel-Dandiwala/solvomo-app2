<script setup lang="ts">
definePageMeta({ layout: "app" });
useHead({ title: "Creative assets — Solvomo" });
</script>

<template>
  <AssetLibraryScreen
    kind="creative"
    title="Creative assets"
    description="Solvomo-owned creatives used in simulations. Immutable after save — duplicate to revise."
    empty-label="No creative assets yet. Save from Simulation or upload when creating a new asset."
  />
</template>
