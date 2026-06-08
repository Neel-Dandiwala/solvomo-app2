<script setup lang="ts">
import { Send, X } from "lucide-vue-next";
import type { InsightChatMessage } from "~/types/insights";
import { brandScopeBody } from "~/utils/apiScope";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

const api = useApiClient();
const workspace = useWorkspaceContext();

const history = ref<InsightChatMessage[]>([]);
const draft = ref("");
const sending = ref(false);
const error = ref<string | null>(null);
const bottomEl = ref<HTMLElement | null>(null);

async function send() {
  const message = draft.value.trim();
  if (!message || sending.value) return;

  const ws = workspace.currentWorkspaceId.value?.trim();
  const bp = workspace.currentBrandProfileId.value?.trim();
  if (!ws || !bp) return;

  history.value.push({ role: "user", content: message });
  draft.value = "";
  sending.value = true;
  error.value = null;

  await nextTick();
  bottomEl.value?.scrollIntoView({ behavior: "smooth" });

  try {
    const res = await api.postJson<{ data: { reply: string } }>("/insights/chat", {
      ...brandScopeBody(ws, bp),
      message,
      history: history.value.slice(0, -1),
    });
    history.value.push({ role: "assistant", content: res.data.reply });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not reach the insights assistant.";
    history.value.pop();
  } finally {
    sending.value = false;
    await nextTick();
    bottomEl.value?.scrollIntoView({ behavior: "smooth" });
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void send();
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <aside
      v-if="open"
      class="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-black/[0.08] bg-white shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-black/[0.08] px-4 py-3">
        <div>
          <p class="text-[14px] font-semibold text-black">Insights assistant</p>
          <p class="text-[11px] text-black/45">Ask about your performance data</p>
        </div>
        <button
          type="button"
          class="rounded-lg p-1.5 text-black/40 transition hover:bg-black/[0.05] hover:text-black"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div
          v-if="history.length === 0"
          class="rounded-2xl bg-slate-50 px-4 py-3 text-[12px] text-black/50"
        >
          Ask me anything about the insights on this page — what's driving a metric, what an anomaly means, or what you should do next.
        </div>

        <div
          v-for="(msg, i) in history"
          :key="i"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed"
            :class="{
              'bg-black text-white rounded-br-sm': msg.role === 'user',
              'bg-slate-100 text-black/80 rounded-bl-sm': msg.role === 'assistant',
            }"
          >
            {{ msg.content }}
          </div>
        </div>

        <div v-if="sending" class="flex justify-start">
          <div class="rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-[12px] text-black/40">
            Thinking…
          </div>
        </div>

        <p v-if="error" class="text-[11px] text-red-600">{{ error }}</p>
        <div ref="bottomEl" />
      </div>

      <div class="border-t border-black/[0.08] p-3">
        <div class="flex items-end gap-2 rounded-2xl border border-black/[0.1] bg-white px-3 py-2">
          <textarea
            v-model="draft"
            rows="1"
            placeholder="Ask about your insights…"
            class="flex-1 resize-none bg-transparent text-[13px] text-black outline-none placeholder:text-black/30"
            style="field-sizing: content; max-height: 100px"
            @keydown="onKeydown"
          />
          <button
            type="button"
            class="shrink-0 rounded-lg bg-black p-1.5 text-white transition hover:bg-black/80 disabled:opacity-40"
            :disabled="!draft.trim() || sending"
            @click="send"
          >
            <Send class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
