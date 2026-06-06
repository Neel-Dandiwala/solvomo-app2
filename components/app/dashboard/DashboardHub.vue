<script setup lang="ts">
import SavedDashboardsList from "~/components/app/dashboard/SavedDashboardsList.vue";
import ConnectionEmptyState from "~/components/app/overview/ConnectionEmptyState.vue";
import AiViewBuilderPanel from "~/components/app/overview/AiViewBuilderPanel.vue";
import SuggestedTemplatesGrid from "~/components/app/overview/SuggestedTemplatesGrid.vue";

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
const selectedTemplateId = ref<string | null>(null);
const templatesLoading = computed(() => loading.value);
const templatesError = computed(() => error.value);

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

async function createFromTemplate(templateId: string) {
  const template = templates.value.find((item) => item.id === templateId);
  selectedTemplateId.value = templateId;
  aiPrompt.value = template
    ? `Create ${template.title} dashboard using the available integrations.`
    : aiPrompt.value;
  await runAiGeneration("create");
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
    const view = await generateDashboard({
      prompt,
      mode,
      template_id: selectedTemplateId.value || undefined,
    });
    await refreshViews();
    aiPrompt.value = "";
    selectedTemplateId.value = null;
    openView(view.id);
  } catch {
    aiError.value = "Could not generate this dashboard.";
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
      <p class="text-[22px] font-semibold tracking-[-0.03em] text-black">Dashboards</p>
      <p class="mt-1 max-w-2xl text-[13px] leading-relaxed text-black/55">
        Open a saved dashboard, start from a connector template, or describe a new view with AI.
      </p>
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

      <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)]">
        <SuggestedTemplatesGrid
          :templates="templates"
          :loading="templatesLoading"
          :error="templatesError"
          :busy-template-id="selectedTemplateId"
          @use-template="createFromTemplate"
        />
        <motion.div
          id="dashboard-ai-panel"
          class="lg:sticky lg:top-6 lg:self-start"
          :initial="{ opacity: 0, x: 12 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: 0.1 }"
        >
          <AiViewBuilderPanel
            :prompt="aiPrompt"
            :busy="aiBusy"
            :error="aiError"
            :disabled="!hasConnections"
            @update:prompt="aiPrompt = $event"
            @create="runAiGeneration('create')"
          />
        </motion.div>
      </section>
    </template>
  </motion.div>
</template>
