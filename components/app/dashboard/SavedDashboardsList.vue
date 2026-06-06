<script setup lang="ts">
import { LayoutDashboard, Plus, Star } from "lucide-vue-next";
import type { DashboardViewListItem } from "~/composables/useDashboardTab";

defineProps<{
  views: DashboardViewListItem[];
  loading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  open: [viewId: string];
  create: [];
}>();
</script>

<template>
  <section class="space-y-3">
    <motion.div
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <motion.div :initial="{ opacity: 0 }" :animate="{ opacity: 1 }">
        <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
          Your dashboards
        </p>
        <p class="mt-1 text-[12px] text-black/50">
          Saved views in this workspace and brand profile.
        </p>
      </motion.div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          to="/views/create"
          class="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-medium text-black/80 transition hover:border-black/[0.14]"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="2" />
          Manual create
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-black px-3 py-2 text-[12px] font-medium text-white transition hover:bg-black/90"
          @click="emit('create')"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="2" />
          New with AI
        </button>
      </div>
    </motion.div>

    <p v-if="error" class="text-[12px] text-red-700">{{ error }}</p>
    <p v-else-if="loading" class="text-[12px] text-black/45">Loading dashboards...</p>

    <div
      v-else-if="views.length"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <button
        v-for="view in views"
        :key="view.id"
        type="button"
        class="group flex flex-col rounded-2xl border border-black/[0.06] bg-white p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-black/[0.12] hover:shadow-sm"
        @click="emit('open', view.id)"
      >
        <motion.div
          class="flex items-start justify-between gap-2"
          :whileHover="{ y: -1 }"
          :transition="{ type: 'spring', stiffness: 400, damping: 28 }"
        >
          <div
            class="rounded-xl border border-[rgba(91,123,225,0.14)] bg-[rgba(91,123,225,0.06)] p-2"
          >
            <LayoutDashboard class="h-4 w-4 text-[rgba(55,70,130,0.88)]" :stroke-width="1.9" />
          </div>
          <Star
            v-if="view.isDefault"
            class="h-3.5 w-3.5 shrink-0 text-amber-500"
            :stroke-width="2"
            fill="currentColor"
          />
        </motion.div>
        <p class="mt-3 truncate text-[14px] font-semibold tracking-[-0.02em] text-black">
          {{ view.name }}
        </p>
        <p v-if="view.description" class="mt-1 line-clamp-2 text-[12px] text-black/45">
          {{ view.description }}
        </p>
        <p class="mt-3 text-[11px] text-black/40">
          {{ view.widgetCount }} widgets · {{ view.datasourceCount }} sources
        </p>
      </button>
    </div>

    <SurfaceCard
      v-else
      variant="soft"
      padding="md"
      class="border border-dashed border-black/[0.1]"
    >
      <p class="text-[14px] font-medium text-black">No dashboards yet</p>
      <p class="mt-1 text-[12px] text-black/50">
        Use a template below or describe what you want in the AI builder.
      </p>
    </SurfaceCard>
  </section>
</template>
