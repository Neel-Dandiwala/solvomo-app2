<script setup lang="ts">
import SavedDashboardsList from "~/components/app/dashboard/SavedDashboardsList.vue";
import ConnectionEmptyState from "~/components/app/overview/ConnectionEmptyState.vue";
import AiViewBuilderPanel from "~/components/app/overview/AiViewBuilderPanel.vue";

const router = useRouter();
const {
  views,
  templates,
  hasConnections,
  loading,
  error,
  refresh,
  refreshViews,
  generateDashboard,
} = useDashboardTab();

const aiPrompt = ref("");
const aiBusy = ref(false);
const aiError = ref<string | null>(null);
const templatesLoading = computed(() => loading.value);

const showConnectionEmptyState = computed(
  () => !loading.value && !hasConnections.value && views.value.length === 0,
);

function openView(viewId: string) {
  void router.push(`/app/dashboards/${encodeURIComponent(viewId)}`);
}

function focusAiCreate() {
  aiPrompt.value = "Build a focused dashboard from my connected sources.";
  document.getElementById("dashboard-ai-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function runAiGeneration(mode: "create" | "modify") {
  const prompt = aiPrompt.value.trim();
  if (!prompt) {
    aiError.value = "Describe the dashboard you want.";
    return;
  }
  aiBusy.value = true;
  aiError.value = null;
  try {
    const view = await generateDashboard({ prompt, mode });
    await refreshViews();
    aiPrompt.value = "";
    openView(view.id);
  } catch (e) {
    aiError.value =
      e instanceof Error && e.message
        ? e.message
        : "Could not generate this dashboard.";
  } finally {
    aiBusy.value = false;
  }
}

onMounted(() => {
  void refresh({ force: true });
});
</script>

<template>
  <motion.div
    class="max-w-full space-y-8 overflow-x-hidden pb-2"
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :transition="{ duration: 0.25 }"
  >
    <motion.div
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.3 }"
    >
      <PageHeader
        title="Dashboards"
        description="Open a saved dashboard, start from a connector template, or describe a new view with AI."
        dense
        hide-context
      />
    </motion.div>

    <ConnectionEmptyState v-if="showConnectionEmptyState" />

    <template v-else>
      <SavedDashboardsList
        :views="views"
        :loading="loading"
        :error="error"
        @open="openView"
        @create="focusAiCreate"
      />

      <motion.div
        id="dashboard-ai-panel"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: 0.1 }"
      >
        <AiViewBuilderPanel
          :prompt="aiPrompt"
          :templates="templates"
          :templates-loading="templatesLoading"
          :busy="aiBusy"
          :error="aiError"
          :disabled="!hasConnections"
          @update:prompt="aiPrompt = $event"
          @create="runAiGeneration('create')"
        />
      </motion.div>
    </template>
  </motion.div>
</template>
