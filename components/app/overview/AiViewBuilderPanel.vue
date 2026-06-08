<script setup lang="ts">
import { Sparkles, WandSparkles } from "lucide-vue-next";
import type { DashboardTemplateSuggestion } from "~/types/saved-view";

const props = defineProps<{
  prompt: string;
  templates?: DashboardTemplateSuggestion[];
  templatesLoading?: boolean;
  busy?: boolean;
  error?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:prompt": [value: string];
  create: [];
}>();

const fallbackChips = [
  "Show Meta spend and ROAS",
  "Track Instagram engagement",
  "Build a weekly growth view",
  "Compare paid vs organic",
];

const suggestedTemplates = computed(() => props.templates ?? []);
const hasTemplates = computed(() => suggestedTemplates.value.length > 0);

function templatePrompt(template: DashboardTemplateSuggestion): string {
  const description = template.description?.trim();
  return description ? `${template.title}: ${description}` : `Build a ${template.title} dashboard.`;
}

function setPrompt(value: string) {
  emit("update:prompt", value);
}

function appendPrompt(value: string) {
  emit(
    "update:prompt",
    props.prompt.trim() ? `${props.prompt.trim()}\n${value}` : value,
  );
}
</script>

<template>
  <SurfaceCard variant="soft" padding="md" class="border border-black/[0.06]">
    <div class="flex items-start gap-3">
      <div class="rounded-2xl border border-[rgba(91,123,225,0.16)] bg-[rgba(91,123,225,0.07)] p-2.5">
        <WandSparkles class="h-4.5 w-4.5 text-[rgba(55,70,130,0.88)]" :stroke-width="1.9" />
      </div>
      <div>
        <p class="text-[15px] font-semibold tracking-[-0.02em] text-black">
          Ask AI to build a view
        </p>
        <p class="mt-1 text-[12px] leading-5 text-black/50">
          Describe the dashboard you want, or start from a suggestion. AI uses only metrics available from your connected sources.
        </p>
      </div>
    </div>

    <!-- AI-generated suggested templates double as ready-to-edit prompts. -->
    <div v-if="hasTemplates" class="mt-4">
      <p class="text-[12px] font-semibold text-black/55">Suggested templates</p>
      <div class="mt-2 grid gap-2 sm:grid-cols-2">
        <button
          v-for="template in suggestedTemplates"
          :key="template.id"
          type="button"
          class="group flex flex-col rounded-2xl border border-black/[0.08] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-black/16 hover:shadow-[0_24px_56px_-46px_rgba(15,23,42,0.4)]"
          @click="setPrompt(templatePrompt(template))"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-[13px] font-semibold tracking-[-0.02em] text-black">
              {{ template.title }}
            </span>
            <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(91,123,225,0.07)] px-2 py-0.5 text-[10px] font-semibold text-[rgba(55,70,130,0.86)]">
              <Sparkles class="h-2.5 w-2.5" :stroke-width="2" />
              Prompt
            </span>
          </div>
          <p class="mt-1.5 line-clamp-2 text-[12px] leading-5 text-black/55">
            {{ template.description }}
          </p>
          <div class="mt-2.5 flex flex-wrap gap-1.5">
            <SourceChip
              v-for="chip in (template.source_chips?.length ? template.source_chips : template.connection_slugs)"
              :key="chip"
              :label="chip"
            />
          </div>
        </button>
      </div>
    </div>

    <!-- Generic starter prompts when there are no scoped templates yet. -->
    <div v-else-if="!templatesLoading" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="chip in fallbackChips"
        :key="chip"
        type="button"
        class="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/60 transition hover:border-black/16 hover:text-black"
        @click="appendPrompt(chip)"
      >
        {{ chip }}
      </button>
    </div>

    <textarea
      :value="prompt"
      rows="6"
      class="app-control mt-4 min-h-[9rem] w-full resize-y text-[14px]"
      placeholder="Example: Build a Meta Ads + Instagram dashboard with spend, CTR, ROAS, engagement trend, and campaign performance."
      @input="$emit('update:prompt', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="mt-2 text-[12px] text-red-700">{{ error }}</p>

    <button
      type="button"
      class="app-button button-primary mt-4 w-full text-sm"
      :disabled="busy || disabled"
      @click="$emit('create')"
    >
      <WandSparkles class="h-4 w-4" :stroke-width="1.9" />
      {{ busy ? "Creating..." : "Create AI view" }}
    </button>
    <p class="mt-3 text-center text-[11px] font-medium text-black/42">
      Scoped to connected sources only.
    </p>
  </SurfaceCard>
</template>
