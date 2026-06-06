<script setup lang="ts">
import DashboardViewScreen from "~/components/app/dashboard/DashboardViewScreen.vue";

definePageMeta({ layout: "app" });

const route = useRoute();
const viewId = computed(() => String(route.params.viewId || "").trim());
</script>

<template>
  <DashboardViewScreen v-if="viewId" :view-id="viewId" />
</template>
