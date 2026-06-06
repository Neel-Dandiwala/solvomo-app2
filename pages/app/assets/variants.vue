<script setup lang="ts">
definePageMeta({ layout: "app" });
useHead({ title: "Variant assets — Solvomo" });
</script>

<template>
  <AssetLibraryScreen
    kind="variants"
    title="Variant assets"
    description="Named variant slots linked to creative assets for reuse across simulations."
    empty-label="No variant assets yet."
  />
</template>
