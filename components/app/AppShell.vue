<script setup lang="ts">
import PlaygroundBanner from "./PlaygroundBanner.vue";

const route = useRoute();
const auth = useAuth();
const { isPlayground, sidebarCollapsed, mobileNavOpen, closeMobileNav } = useWorkspaceContext();

watch(
  () => route.fullPath,
  () => {
    closeMobileNav();
  },
);
</script>

<template>
  <div class="app-shell flex h-svh min-h-0 w-full flex-col overflow-hidden text-black">
    <PlaygroundBanner v-if="isPlayground" class="shrink-0" />
    <div
      v-show="mobileNavOpen"
      class="fixed inset-0 z-20 bg-black/40 lg:hidden"
      aria-hidden="true"
      @click="closeMobileNav"
    />
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <AppSidebar
        :class="{
          'app-sidebar--collapsed': sidebarCollapsed,
          'app-sidebar--mobile-open': mobileNavOpen,
        }"
      />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar class="shrink-0" />
        <main class="app-main-scroll page-haze min-h-0 flex-1 overflow-auto">
          <div
            class="app-main-inner sv-page mx-auto w-full max-w-[1380px] px-4 py-8 sm:px-6 sm:py-9 lg:px-8 lg:py-10 xl:px-10"
          >
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
