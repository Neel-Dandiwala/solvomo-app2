<script setup lang="ts">
defineProps<{
  status: "ready" | "missing_session" | "missing_scope";
}>();
</script>

<template>
  <EmptyState
    v-if="status !== 'ready'"
    :title="status === 'missing_session' ? 'Sign in to continue' : 'Workspace is still loading'"
    :description="
      status === 'missing_session'
        ? 'Use Google sign-in to open your Solvomo workspace and load your dashboards.'
        : 'We are preparing your workspace, brand, and environment context. This usually takes a moment.'
    "
  />
</template>
