<script setup lang="ts">
definePageMeta({ layout: "app" });

const route = useRoute();
const viewId = String(route.params.viewId || "").trim();

await navigateTo(
  viewId ? `/app/dashboards/${encodeURIComponent(viewId)}` : "/app/dashboards",
  { replace: true },
);
</script>

<template>
  <motion.div />
</template>
