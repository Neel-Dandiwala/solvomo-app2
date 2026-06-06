<script setup lang="ts">
import type { DashboardTemplateSuggestion } from "~/types/saved-view";

defineProps<{
  templates: DashboardTemplateSuggestion[];
  loading?: boolean;
  error?: string | null;
  busyTemplateId?: string | null;
}>();

defineEmits<{
  useTemplate: [templateId: string];
}>();
</script>

<template>
  <SurfaceCard variant="frame" padding="md" class="border border-black/[0.06]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
          Suggested templates
        </p>
        <p class="mt-1 text-[12px] leading-5 text-black/50">
          AI-generated from the sources connected to this workspace.
        </p>
      </div>
      <p v-if="loading" class="text-[12px] text-black/45">Loading...</p>
    </div>

    <p v-if="error" class="mt-3 text-[12px] text-red-700">{{ error }}</p>
    <div v-else-if="templates.length" class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <SuggestedTemplateCard
        v-for="template in templates"
        :key="template.id"
        :template="template"
        :busy="busyTemplateId === template.id"
        @use="$emit('useTemplate', $event)"
      />
    </div>
    <EmptyDashboardState
      v-else-if="!loading"
      class="mt-5"
      title="No templates available yet."
      description="Connect a supported metric source or ask AI to build a custom view from the sources available."
    />
  </SurfaceCard>
</template>
