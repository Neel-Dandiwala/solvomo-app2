<script setup lang="ts">
import { CircleUserRound } from "lucide-vue-next";

const auth = useAuth();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

function onDocClick(e: MouseEvent) {
  if (!open.value || !root.value) return;
  if (!root.value.contains(e.target as Node)) open.value = false;
}

async function signOut() {
  open.value = false;
  await auth.logout();
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));
</script>

<template>
  <div ref="root" class="relative flex shrink-0 items-center">
    <button
      type="button"
      class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-black/72 shadow-sm transition hover:border-black/16 hover:bg-black/[0.02] hover:text-black"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Open user menu"
      @click.stop="open = !open"
    >
      <CircleUserRound class="h-5 w-5" :stroke-width="2" aria-hidden="true" />
    </button>
    <Transition name="app-pop">
      <div
        v-show="open"
        class="app-switcher-menu absolute right-0 top-full z-50 mt-2 w-60 rounded-[1.25rem] border border-black/10 bg-white p-2 shadow-lg"
        role="menu"
      >
        <p class="sv-control-label px-3 pt-2">
          {{ auth.displayName }}
        </p>
        <p class="px-3 pb-2 pt-1 text-[13px] text-black/52">
          {{ auth.displayEmail }}
        </p>
        <NuxtLink
          to="/app/settings"
          class="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/[0.03]"
          role="menuitem"
          @click="open = false"
        >
          User settings
        </NuxtLink>
        <button
          type="button"
          class="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-black/[0.03]"
          role="menuitem"
          @click="signOut"
        >
          Sign out
        </button>
      </div>
    </Transition>
  </div>
</template>
