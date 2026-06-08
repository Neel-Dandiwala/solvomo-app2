<script setup lang="ts">
import { MessageCircle } from "lucide-vue-next";
import InsightAnomalyWidget from "./insights/InsightAnomalyWidget.vue";
import InsightCampaignBreakdownWidget from "./insights/InsightCampaignBreakdownWidget.vue";
import InsightCrossPlatformWidget from "./insights/InsightCrossPlatformWidget.vue";
import InsightTrendWidget from "./insights/InsightTrendWidget.vue";
import InsightsChatPanel from "./insights/InsightsChatPanel.vue";
import type {
  AnomalyData,
  CampaignBreakdownData,
  CrossPlatformData,
  InsightWidgetResult,
  TrendData,
} from "~/types/insights";

const { widgets, loading, error, is_generating_config, refresh } = useInsightsTab();
const chatOpen = ref(false);

function asCrossPlatform(w: InsightWidgetResult) {
  return w.data as CrossPlatformData;
}
function asTrend(w: InsightWidgetResult) {
  return w.data as TrendData;
}
function asCampaignBreakdown(w: InsightWidgetResult) {
  return w.data as CampaignBreakdownData;
}
function asAnomaly(w: InsightWidgetResult) {
  return w.data as AnomalyData;
}
</script>

<template>
  <div class="relative max-w-full space-y-5 pb-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[22px] font-semibold tracking-[-0.03em] text-black">
          Insights
        </p>
        <p class="mt-1 text-[13px] text-black/50">
          AI-generated analysis from your connected data sources.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-medium text-black/70 shadow-sm transition hover:bg-black/[0.03]"
          @click="void refresh({ force: true, force_regen: true })"
        >
          Refresh
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] px-3 py-2 text-[12px] font-medium transition"
          :class="chatOpen
            ? 'bg-black text-white'
            : 'bg-white text-black/70 shadow-sm hover:bg-black/[0.03]'"
          @click="chatOpen = !chatOpen"
        >
          <MessageCircle class="h-3.5 w-3.5" />
          Ask AI
        </button>
      </div>
    </div>

    <!-- Loading -->
    <SurfaceCard
      v-if="loading"
      variant="soft"
      padding="md"
    >
      <div class="flex items-center gap-3">
        <div class="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
        <p class="text-[13px] text-black/55">Loading insights and analysing your data…</p>
      </div>
    </SurfaceCard>

    <!-- Config freshly regenerated banner (shown after load) -->
    <div
      v-else-if="is_generating_config && !loading && widgets.length > 0"
      class="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-[12px] text-indigo-700"
    >
      Analysis plan updated — your connected sources changed so the AI designed a new configuration.
    </div>

    <!-- Error -->
    <SurfaceCard v-else-if="error" variant="soft" padding="md" class="border border-red-100">
      <p class="text-[13px] text-red-700">{{ error }}</p>
    </SurfaceCard>

    <!-- No connections -->
    <SurfaceCard
      v-else-if="!loading && widgets.length === 0"
      variant="soft"
      padding="md"
      class="border border-dashed border-black/[0.08]"
    >
      <p class="text-[14px] font-medium text-black">No insights yet</p>
      <p class="mt-1 text-[12px] text-black/50">
        Connect a data source from the Connections tab to start generating insights.
      </p>
    </SurfaceCard>

    <!-- Widget grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SurfaceCard
        v-for="widget in widgets"
        :key="widget.id"
        variant="frame"
        padding="md"
        class="border border-black/[0.06]"
      >
        <InsightCrossPlatformWidget
          v-if="widget.widget_type === 'cross_platform_comparison'"
          :display_title="widget.display_title"
          :headline="widget.headline"
          :narrative="widget.narrative"
          :insight_kind="widget.insight_kind"
          :severity="widget.severity"
          :indicators="widget.indicators"
          :data="asCrossPlatform(widget)"
        />
        <InsightTrendWidget
          v-else-if="widget.widget_type === 'trend_indicator'"
          :display_title="widget.display_title"
          :headline="widget.headline"
          :narrative="widget.narrative"
          :insight_kind="widget.insight_kind"
          :severity="widget.severity"
          :indicators="widget.indicators"
          :data="asTrend(widget)"
        />
        <InsightCampaignBreakdownWidget
          v-else-if="widget.widget_type === 'campaign_breakdown'"
          :display_title="widget.display_title"
          :headline="widget.headline"
          :narrative="widget.narrative"
          :insight_kind="widget.insight_kind"
          :severity="widget.severity"
          :indicators="widget.indicators"
          :data="asCampaignBreakdown(widget)"
        />
        <InsightAnomalyWidget
          v-else-if="widget.widget_type === 'anomaly_highlight'"
          :display_title="widget.display_title"
          :headline="widget.headline"
          :narrative="widget.narrative"
          :insight_kind="widget.insight_kind"
          :severity="widget.severity"
          :indicators="widget.indicators"
          :data="asAnomaly(widget)"
        />
      </SurfaceCard>
    </div>

    <InsightsChatPanel :open="chatOpen" @close="chatOpen = false" />

    <!-- Backdrop when chat is open on small screens -->
    <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div
        v-if="chatOpen"
        class="fixed inset-0 z-30 bg-black/20 lg:hidden"
        @click="chatOpen = false"
      />
    </Transition>
  </div>
</template>
