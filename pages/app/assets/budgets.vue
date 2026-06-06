<script setup lang="ts">
definePageMeta({ layout: "app" });
useHead({ title: "Budget assets — Solvomo" });
</script>

<template>
  <AssetLibraryScreen
    kind="budgets"
    title="Budget assets"
    description="Budget and bid strategy presets for simulations."
    empty-label="No budget assets yet."
  />
</template>
