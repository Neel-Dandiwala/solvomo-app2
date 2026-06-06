<script setup lang="ts">
import type { OverviewWidgetConfig } from "~/types/mock";
import type { OverviewWidgetPayload } from "~/composables/useOverviewWidgetPayloads";
import OverviewWidgetRenderer from "~/components/app/overview/OverviewWidgetRenderer.vue";

type SignalLink = { label: string; to: string };

const props = withDefaults(
  defineProps<{
    widget: OverviewWidgetConfig;
    payload: OverviewWidgetPayload | null;
    variant?: "frame" | "product" | "soft" | "depth";
    padding?: "sm" | "md" | "lg";
    gridClass?: string;
    /** Single anchored line (e.g. tied to this chart’s metric) */
    callout?: string | null;
    /** Hero: compact linked labels, no extra box */
    signalLinks?: SignalLink[];
    /** Optional risk / attention line under signals (hero) */
    riskLine?: string | null;
    compact?: boolean;
    tableExpanded?: boolean;
    /** False = title sits closer to chart, thin separator only */
    showDivider?: boolean;
    /** Smaller, quieter title */
    titleQuiet?: boolean;
  }>(),
  {
    callout: null,
    riskLine: null,
    signalLinks: () => [],
    compact: false,
    tableExpanded: false,
    showDivider: true,
    titleQuiet: false,
  },
);

const sizeClass = computed(() => {
  if (props.gridClass) return props.gridClass;
  switch (props.widget.size) {
    case "xs":
      return "col-span-12 sm:col-span-6 lg:col-span-3";
    case "sm":
      return "col-span-12 sm:col-span-6 lg:col-span-4";
    case "lg":
      return "col-span-12 lg:col-span-8";
    case "full":
      return "col-span-12";
    default:
      return "col-span-12 sm:col-span-6 lg:col-span-4";
  }
});

const showDetailToggle = computed(
  () => props.payload?.kind === "table" && (props.payload.rows?.length || 0) > 5,
);

defineEmits<{
  "toggle-detail": [];
}>();
</script>

<template>
  <SurfaceCard
    :variant="variant || 'frame'"
    :padding="padding || (compact ? 'sm' : 'md')"
    class="group h-full min-w-0 max-w-full overflow-hidden"
    :class="sizeClass"
  >
    <div class="min-w-0">
      <h3
        class="truncate font-semibold tracking-[-0.02em] text-black"
        :class="titleQuiet ? 'text-[13px]' : 'sv-card-title'"
      >
        {{ widget.title }}
      </h3>
      <div
        v-if="signalLinks.length"
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        <NuxtLink
          v-for="(link, idx) in signalLinks"
          :key="`${link.to}-${idx}`"
          :to="link.to"
          class="text-[12px] font-semibold text-black/45 transition hover:text-black"
        >
          {{ link.label }}
        </NuxtLink>
      </div>
      <p
        v-if="riskLine"
        class="mt-2 text-[12px] font-medium leading-snug text-[rgba(127,29,29,0.88)]"
      >
        {{ riskLine }}
      </p>
      <p
        v-if="callout"
        class="mt-2 border-l-2 border-[rgba(91,123,225,0.4)] pl-2.5 text-[12px] font-medium leading-snug text-black/65"
      >
        {{ callout }}
      </p>
    </div>

    <div v-if="payload" :class="showDivider ? 'mt-3 border-t border-black/[0.06] pt-3' : 'mt-3'">
      <OverviewWidgetRenderer
        :payload="payload"
        :compact="compact"
        :table-expanded="tableExpanded"
      />
      <button
        v-if="showDetailToggle"
        type="button"
        class="mt-2.5 text-[13px] font-semibold text-black/45 hover:text-black"
        @click="$emit('toggle-detail')"
      >
        {{ tableExpanded ? "Less" : "Details" }}
      </button>
    </div>
    <EmptyState
      v-else
      class="mt-3 border-0 bg-transparent px-0 py-0 text-left"
      title="No data"
      description="Widen range or connect sources."
    />
  </SurfaceCard>
</template>
