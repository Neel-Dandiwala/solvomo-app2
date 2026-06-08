<script setup lang="ts">
import { ChevronDown, Menu } from "lucide-vue-next";
import UserMenu from "~/components/app/UserMenu.vue";

const {
  brandProfilesForWorkspace,
  currentBrandProfile,
  setBrandProfile,
  toggleMobileNav,
} = useWorkspaceContext();

const brandOpen = ref(false);
const brandRoot = ref<HTMLElement | null>(null);

function switchBrandProfile(id: string) {
  if (id === currentBrandProfile.value?.id) {
    brandOpen.value = false;
    return;
  }
  setBrandProfile(id);
  brandOpen.value = false;
  // Full reload so all tab data is re-fetched for the new brand.
  window.location.reload();
}

function onBrandDocClick(e: MouseEvent) {
  if (!brandOpen.value || !brandRoot.value) return;
  if (!brandRoot.value.contains(e.target as Node)) brandOpen.value = false;
}

onMounted(() => document.addEventListener("click", onBrandDocClick));
onUnmounted(() => document.removeEventListener("click", onBrandDocClick));
</script>

<template>
  <header class="app-topbar sticky top-0 z-30 grid h-[4.5rem] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-black/8 px-4 lg:h-[4.75rem] lg:px-6">
    <div class="flex min-w-0 items-center gap-4">
      <button
        type="button"
        class="inline-flex rounded-2xl border border-black/8 bg-white p-2.5 text-black/60 shadow-sm hover:bg-black/[0.03] hover:text-black lg:hidden"
        aria-label="Open navigation"
        @click="toggleMobileNav"
      >
        <Menu class="h-5 w-5" :stroke-width="1.9" />
      </button>
      <div class="min-w-0 flex-1">
        <p class="sv-meta hidden sm:block">
          {{ currentBrandProfile?.name }}
        </p>
      </div>
      <div class="hidden min-w-0 max-w-[18rem] flex-1 justify-center px-2 2xl:flex lg:max-w-[20rem] lg:flex-none">
        <CommandSearchTrigger />
      </div>
    </div>

    <div class="flex shrink-0 items-center justify-end gap-2.5">
      <div class="hidden 2xl:block">
        <WorkspaceSwitcher />
      </div>
      <div ref="brandRoot" class="relative">
        <button
          type="button"
          class="app-switcher-trigger hidden min-h-[3rem] max-w-[12.5rem] items-center gap-2.5 px-3.5 py-2.5 text-left transition hover:border-black/16 xl:flex"
          aria-haspopup="listbox"
          :aria-expanded="brandOpen"
          @click.stop="brandOpen = !brandOpen"
        >
          <span class="min-w-0">
            <span class="sv-control-label block truncate">Brand profile</span>
            <span class="block truncate text-[15px] font-semibold text-black">{{ currentBrandProfile?.name }}</span>
          </span>
          <ChevronDown class="ml-auto h-4 w-4 shrink-0 text-black/40" :stroke-width="1.9" aria-hidden="true" />
        </button>
        <Transition name="app-pop">
          <ul
            v-show="brandOpen"
            class="app-switcher-menu absolute right-0 top-full z-50 mt-2 w-72 rounded-[1.25rem] border border-black/10 bg-white p-2 shadow-lg"
            role="listbox"
          >
            <li class="sv-control-label px-3 py-2">
              Brand profiles
            </li>
            <li v-for="b in brandProfilesForWorkspace" :key="b.id">
              <button
                type="button"
                class="flex w-full flex-col rounded-xl px-3 py-2.5 text-left text-sm hover:bg-black/[0.03]"
                :class="b.id === currentBrandProfile?.id ? 'bg-black/[0.035] font-semibold' : ''"
                @click="switchBrandProfile(b.id)"
              >
                <span class="text-[0.95rem] text-black">{{ b.name }}</span>
                <span
                  v-if="b.isPlaygroundSystem"
                  class="mt-0.5 text-[12px] font-medium text-black/45"
                >
                  Sample data · always available
                </span>
                <span class="mt-1 text-[13px] leading-relaxed text-black/55">{{ b.currency }} · {{ b.attributionPreference }}</span>
              </button>
            </li>
          </ul>
        </Transition>
      </div>
      <UserMenu />
    </div>
  </header>
</template>
