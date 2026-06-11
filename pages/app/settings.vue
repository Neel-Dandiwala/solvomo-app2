<script setup lang="ts">
definePageMeta({ layout: "app" });

useHead({ title: "Settings — Solvomo" });

const { displayName, displayEmail } = useAuth();
const { currentWorkspace, currentBrandProfile } = useWorkspaceContext();

const section = ref<"user" | "workspace" | "brand" | "members" | "api">("user");

const navSections = [
  {
    label: "Account",
    tabs: [
      { id: "user" as const, label: "User" },
      { id: "brand" as const, label: "Brand & attribution" },
    ],
  },
  {
    label: "Workspace",
    tabs: [
      { id: "workspace" as const, label: "Workspace profile" },
      { id: "members" as const, label: "Members" },
      { id: "api" as const, label: "API keys" },
    ],
  },
] as const;
</script>

<template>
  <div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <PageHeader title="Settings" dense metadata-tight hide-context />

    <SurfaceCard variant="soft" padding="sm" class="border border-black/[0.05]">
      <AnalyticsMetadataStrip
        :items="[
          { label: 'Workspace', value: currentWorkspace?.name || '—' },
          { label: 'Brand profile', value: currentBrandProfile?.name || '—' },
        ]"
      />
    </SurfaceCard>

    <div class="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <nav class="flex shrink-0 flex-col gap-6 lg:w-56">
        <div v-for="group in navSections" :key="group.label">
          <p class="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">
            {{ group.label }}
          </p>
          <div class="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <button
              v-for="tab in group.tabs"
              :key="tab.id"
              type="button"
              class="rounded-xl px-3 py-2 text-left text-sm font-semibold transition"
              :class="section === tab.id ? 'bg-black/[0.06] text-black' : 'text-black/50 hover:text-black'"
              @click="section = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </nav>

      <SurfaceCard variant="frame" class="min-w-0 flex-1 overflow-hidden" padding="lg">
        <template v-if="section === 'user'">
          <h2 class="sv-card-title">
            User
          </h2>
          <p class="mt-1 text-sm text-black/50">
            Profile and notifications for your login.
          </p>
          <div class="mt-8 max-w-2xl">
            <div class="grid gap-6 sm:grid-cols-2 sm:items-end">
              <div class="flex min-w-0 flex-col gap-2">
                <label for="settings-fullname" class="sv-section-title">Full Name</label>
                <input
                  id="settings-fullname"
                  class="app-control w-full"
                  type="text"
                  :value="displayName"
                  readonly
                  autocomplete="name"
                >
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <label for="settings-email" class="sv-section-title">Email</label>
                <div
                  id="settings-email"
                  class="flex min-h-[3rem] w-full items-center rounded-[var(--sv-radius-control)] border border-black/[0.08] bg-white px-4 text-[0.98rem] font-semibold leading-tight tracking-[-0.015em] text-black/88 shadow-[0_10px_24px_-26px_rgba(15,23,42,0.18)]"
                  role="status"
                >
                  {{ displayEmail }}
                </div>
              </div>
            </div>
          </div>
          <div class="mt-10 max-w-2xl">
            <p class="sv-section-title">
              Preferences
            </p>
            <div class="mt-4 space-y-3 text-sm text-black/65">
              <label class="flex items-center justify-between gap-4 rounded-xl border border-black/8 px-4 py-3.5">
                <span class="font-medium text-black/80">Operational alert emails</span>
                <input type="checkbox" checked class="h-4 w-4 rounded border-black/15">
              </label>
              <label class="flex items-center justify-between gap-4 rounded-xl border border-black/8 px-4 py-3.5">
                <span class="font-medium text-black/80">Weekly summary digest</span>
                <input type="checkbox" checked class="h-4 w-4 rounded border-black/15">
              </label>
            </div>
          </div>
        </template>

        <template v-else-if="section === 'workspace'">
          <h2 class="sv-card-title">
            Workspace profile
          </h2>
          <p class="mt-1 text-sm text-black/50">
            Billing and workspace defaults (not brand-level models).
          </p>
          <p class="mt-6 text-sm text-black/60">
            Signed in as <span class="font-semibold text-black">{{ displayName }}</span>
            <span class="text-black/45">· {{ displayEmail }}</span>
          </p>
          <label class="mt-6 block text-xs font-bold uppercase tracking-wide text-black/45">Workspace display name</label>
          <input class="auth-input mt-2 max-w-md" type="text" :value="currentWorkspace?.name" readonly>
          <p class="mt-2 text-xs text-black/45">
            Rename and billing email ship with account service integration.
          </p>
        </template>

        <template v-else-if="section === 'members'">
          <h2 class="sv-card-title">
            Members
          </h2>
          <p class="mt-1 text-sm text-black/50">
            Collaborators in this workspace.
          </p>
          <div class="mt-6 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-6 text-sm text-black/45">
            Member management is coming soon. Invite links and SSO sync will appear here.
          </div>
        </template>

        <template v-else-if="section === 'api'">
          <h2 class="sv-card-title">
            API keys
          </h2>
          <p class="mt-1 text-sm text-black/50">
            Programmatic access scoped to this workspace.
          </p>
          <div class="mt-6 rounded-2xl border border-dashed border-black/12 bg-black/[0.015] p-6 text-sm text-black/45">
            API key management is coming soon. Keys and scopes will appear here once enabled for your workspace.
          </div>
        </template>

        <template v-else>
          <h2 class="sv-card-title">
            Brand profile & attribution — {{ currentBrandProfile?.name }}
          </h2>
          <p class="mt-1 text-sm text-black/50">
            Currency and attribution for this brand profile only.
          </p>
          <ul class="mt-6 space-y-3 text-sm text-black/65">
            <li>
              <span class="font-semibold text-black">Currency:</span>
              {{ currentBrandProfile?.currency }}
            </li>
            <li>
              <span class="font-semibold text-black">Attribution:</span>
              {{ currentBrandProfile?.attributionPreference }}
            </li>
          </ul>
          <NuxtLink
            to="/onboarding/brand-setup?edit=1"
            class="button-secondary mt-8 inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Brand setup wizard
          </NuxtLink>
        </template>
      </SurfaceCard>
    </div>
  </div>
</template>
