<script setup lang="ts">
import { WandSparkles } from "lucide-vue-next";

const props = defineProps<{
  prompt: string;
  busy?: boolean;
  error?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:prompt": [value: string];
  create: [];
}>();

const promptChips = [
  "Show Meta spend and ROAS",
  "Track Instagram engagement",
  "Build a weekly growth view",
  "Compare paid vs organic",
];

function usePrompt(value: string) {
  emit("update:prompt", props.prompt.trim() ? `${props.prompt.trim()}\n${value}` : value);
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
          Describe the dashboard you want. AI will use only metrics available from your connected sources.
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="chip in promptChips"
        :key="chip"
        type="button"
        class="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/60 transition hover:border-black/16 hover:text-black"
        @click="usePrompt(chip)"
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
