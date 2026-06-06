<script setup lang="ts">
import type { SidebarNavItem } from "~/types/app-shell";
import {
  ChevronsLeft,
  FolderOpen,
  Gauge,
  Image,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Plug,
  Settings2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-vue-next";
import type { Component } from "vue";

const { sidebarNav, sidebarCollapsed, toggleSidebar } = useWorkspaceContext();
const route = useRoute();

const ICON_MAP: Record<NonNullable<SidebarNavItem["icon"]>, Component> = {
  overview: LayoutGrid,
  dashboards: LayoutDashboard,
  insights: Lightbulb,
  simulation: Gauge,
  assets: FolderOpen,
  image: Image,
  evolve: Sparkles,
  users: Users,
  wallet: Wallet,
  plug: Plug,
  settings: Settings2,
};

function iconFor(icon?: SidebarNavItem["icon"]) {
  return ICON_MAP[icon || "overview"];
}

function isActive(to: string) {
  if (to === "/app") return route.path === "/app" || route.path === "/app/overview";
  return route.path === to || route.path.startsWith(`${to}/`);
}

function assetsGroupActive(item: SidebarNavItem) {
  return Boolean(item.children?.length && route.path.startsWith("/app/assets"));
}
</script>

<template>
  <aside
    class="app-sidebar flex h-full min-h-0 shrink-0 flex-col"
    :class="sidebarCollapsed ? 'app-sidebar--narrow' : 'app-sidebar--wide'"
  >
    <div class="flex h-16 items-center gap-3 border-b border-black/8 px-4 lg:h-[4.75rem] lg:px-4.5">
      <NuxtLink
        to="/app"
        class="flex min-w-0 items-center gap-3"
        :class="sidebarCollapsed ? 'justify-center w-full' : ''"
      >
        <div class="logo-mark-color h-9 w-9 shrink-0 border border-black/8">
          <img
            src="~/assets/images/logo/colour_logo.jpeg"
            alt="Solvomo logo"
            class="h-full w-full"
          />
        </div>
        <div v-if="!sidebarCollapsed" class="min-w-0">
          <span class="brand-wordmark block truncate text-[1rem] font-bold tracking-tight">Solvomo</span>
          <span class="sv-meta block truncate">Operator system</span>
        </div>
      </NuxtLink>
    </div>
    <nav
      class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 lg:px-3.5"
      aria-label="Product"
    >
      <div v-if="!sidebarCollapsed" class="sv-section-title px-3 pb-3">Navigation</div>
      <div class="space-y-1.5">
        <template v-for="item in sidebarNav" :key="item.to">
          <NuxtLink
            v-if="!item.children?.length"
            :to="item.to"
            class="app-sidebar-link group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-[15px] font-semibold tracking-[-0.015em] transition-colors"
            :class="[
              isActive(item.to) ? 'app-sidebar-link--active' : 'text-black/70 hover:bg-black/[0.03] hover:text-black',
              sidebarCollapsed ? 'justify-center px-0' : '',
            ]"
          >
            <component
              :is="iconFor(item.icon)"
              class="h-4.5 w-4.5 shrink-0 text-current opacity-75 group-hover:opacity-100"
              :stroke-width="1.9"
              aria-hidden="true"
            />
            <span v-show="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
          <div v-else class="space-y-1">
            <NuxtLink
              :to="item.to"
              class="app-sidebar-link group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-[15px] font-semibold tracking-[-0.015em] transition-colors"
              :class="[
                assetsGroupActive(item) ? 'app-sidebar-link--active' : 'text-black/70 hover:bg-black/[0.03] hover:text-black',
                sidebarCollapsed ? 'justify-center px-0' : '',
              ]"
            >
              <component
                :is="iconFor(item.icon)"
                class="h-4.5 w-4.5 shrink-0 text-current opacity-75 group-hover:opacity-100"
                :stroke-width="1.9"
                aria-hidden="true"
              />
              <span v-show="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>
            <div v-if="!sidebarCollapsed" class="ml-4 space-y-0.5 border-l border-black/8 pl-2">
              <NuxtLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                class="app-sidebar-link block rounded-xl px-3 py-2 text-[14px] font-medium transition-colors"
                :class="isActive(child.to) ? 'app-sidebar-link--active' : 'text-black/60 hover:bg-black/[0.03] hover:text-black'"
              >
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>
    </nav>
    <div class="border-t border-black/8 px-3 py-3.5 lg:px-3.5">
      <button
        type="button"
        class="app-sidebar-link group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-[15px] font-semibold tracking-[-0.015em] text-black/70 transition-colors hover:bg-black/[0.03] hover:text-black"
        :class="sidebarCollapsed ? 'justify-center px-0' : ''"
        @click="toggleSidebar"
      >
        <ChevronsLeft
          class="h-4.5 w-4.5 shrink-0 text-current opacity-75 transition-transform group-hover:opacity-100"
          :class="sidebarCollapsed ? 'rotate-180' : ''"
          :stroke-width="1.9"
          aria-hidden="true"
        />
        <span v-show="!sidebarCollapsed" class="truncate">Collapse rail</span>
      </button>
    </div>
  </aside>
</template>
