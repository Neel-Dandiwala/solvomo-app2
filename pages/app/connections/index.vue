<script setup lang="ts">
import { Search } from "lucide-vue-next";
import IntegrationConnectionCard from "~/components/app/integrations/IntegrationConnectionCard.vue";
import { expandApp2RedirectTemplate } from "~/composables/useConnectionsManifest";
import type { ConnectionsDirectoryItem } from "~/composables/useConnectionsTab";

definePageMeta({ layout: "app" });

useHead({ title: "Connections — Solvomo" });

const route = useRoute();
const auth = useAuth();
const loggedIn = computed(() => auth.isAuthenticated.value);
const api = useApiClient();
const workspace = useWorkspaceContext();
const playground = usePlayground();
const { integrations, loading, error: directoryError, refresh: refreshDirectory } =
  useConnectionsTab();

const VENDOR_APP_OAUTH_SLUGS = new Set(["metaads", "instagram", "tiktok"]);

const search = ref("");
const statusFilter = ref<"all" | "active" | "inactive">("all");
const connectBusySlug = ref<string | null>(null);
const deactivateBusyId = ref<string | null>(null);
const actionError = ref<string | null>(null);

function connectorLogoUrl(logoFile?: string) {
  if (!logoFile?.trim() || !api.hasBase.value) return undefined;
  return `${api.base().replace(/\/$/, "")}/assets/images/integrations/${logoFile.trim()}`;
}

function nameForSlug(slug: string): string | undefined {
  return integrations.value.find((i) => i.slug === slug)?.name;
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase();
  return integrations.value.filter((item) => {
    if (statusFilter.value === "active" && !item.is_active) return false;
    if (statusFilter.value === "inactive" && item.is_active) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q);
  });
});

function credentialRows(item: ConnectionsDirectoryItem) {
  const slug = item.slug.trim();
  const rows = item.integration?.configure?.credentials ?? [];
  if (!slug || !VENDOR_APP_OAUTH_SLUGS.has(slug)) return rows;
  return rows.filter((c) => c.key !== "client_id" && c.key !== "client_secret");
}

async function connect(item: ConnectionsDirectoryItem) {
  actionError.value = null;
  const slug = item.slug.trim();
  if (!slug || !api.hasBase.value) return;

  const rows = credentialRows(item);
  const creds: Record<string, string> = {};
  for (const r of rows) {
    creds[r.key] = "";
  }

  const redirects = item.integration?.configure?.app2?.redirects;
  if (!redirects?.successUrlTemplate || !redirects?.failureUrlTemplate) {
    actionError.value = "This connection is not ready yet. Please contact support.";
    return;
  }

  connectBusySlug.value = slug;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const successRedirectUrl = expandApp2RedirectTemplate(redirects.successUrlTemplate, {
      origin,
      slug,
    });
    const failureRedirectUrl = expandApp2RedirectTemplate(redirects.failureUrlTemplate, {
      origin,
      slug,
    });
    type StartResult =
      | { authorization_url: string; state: string }
      | { required_credentials: string[]; credentials_url?: string };
    const res = await api.postJson<StartResult>("/auth/connections/oauth/start", {
      slug,
      credentials: creds,
      ...(workspace.currentBrandProfileId.value?.trim()
        ? { brandprofile_id: workspace.currentBrandProfileId.value.trim() }
        : {}),
      success_redirect_url: successRedirectUrl,
      failure_redirect_url: failureRedirectUrl,
    });
    if ("authorization_url" in res && res.authorization_url) {
      window.location.href = res.authorization_url;
      return;
    }
    actionError.value = "Could not start sign-in.";
  } catch {
    actionError.value = "Could not start sign-in. Please try again.";
  } finally {
    connectBusySlug.value = null;
  }
}

async function deactivate(item: ConnectionsDirectoryItem) {
  actionError.value = null;
  const connectionId = item.connection_id?.trim();
  if (!connectionId) return;
  deactivateBusyId.value = connectionId;
  try {
    await api.deleteRequest(`/auth/connections/item/${encodeURIComponent(connectionId)}`);
    await refreshDirectory();
  } catch {
    actionError.value = "Could not deactivate this connection. Please try again.";
  } finally {
    deactivateBusyId.value = null;
  }
}

function canConnect(item: ConnectionsDirectoryItem): boolean {
  if (playground.isPlayground.value) return false;
  return Boolean(loggedIn.value && api.hasBase.value && !item.is_active);
}

function canDeactivate(item: ConnectionsDirectoryItem): boolean {
  if (playground.isPlayground.value) return false;
  return Boolean(loggedIn.value && api.hasBase.value && item.is_active && item.connection_id);
}

watch(
  () => route.query.connected,
  () => {
    void refreshDirectory();
  },
);
</script>

<template>
  <motion.div class="max-w-full space-y-5 overflow-x-hidden pb-2">
    <PageHeader
      title="Connections"
      dense
      metadata-tight
      hide-context
      description="Connect data sources for this brand."
    />

    <SurfaceCard
      v-if="route.query.connected && nameForSlug(String(route.query.connected))"
      variant="soft"
      padding="sm"
      class="border border-emerald-200 bg-emerald-50/85"
    >
      <p class="text-[13px] font-semibold text-emerald-950">
        {{ nameForSlug(String(route.query.connected)) }} is connected.
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-else-if="route.query.oauth_error"
      variant="soft"
      padding="sm"
      class="border border-amber-200 bg-amber-50/85"
    >
      <p class="text-[13px] font-semibold text-amber-950">
        Sign-in did not finish. Use Connect to try again.
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-if="directoryError"
      variant="soft"
      padding="sm"
      class="border border-red-200 bg-red-50/85"
    >
      <p class="text-[13px] font-semibold text-red-950">
        {{ directoryError }}
      </p>
    </SurfaceCard>

    <SurfaceCard v-if="actionError" variant="soft" padding="sm" class="border border-red-200 bg-red-50/85">
      <p class="text-[13px] font-semibold text-red-950">
        {{ actionError }}
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-if="loading && !integrations.length"
      variant="soft"
      padding="md"
      class="border border-black/[0.06]"
    >
      <p class="text-[13px] text-black/55">
        Loading connections…
      </p>
    </SurfaceCard>

    <SurfaceCard
      v-else-if="!loading && !integrations.length"
      variant="soft"
      padding="md"
      class="border border-dashed border-black/12"
    >
      <p class="text-[14px] font-semibold text-black">
        No integrations available
      </p>
      <p class="mt-1 text-[13px] text-black/52">
        No connectors are registered yet.
      </p>
    </SurfaceCard>

    <template v-else>
      <FilterBar compact>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
          <label for="conn-search" class="sv-section-title">Search</label>
          <motion.div class="relative">
            <Search
              class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
              :stroke-width="1.9"
              aria-hidden="true"
            />
            <input
              id="conn-search"
              v-model="search"
              type="search"
              placeholder="Search by name…"
              class="app-control min-h-[2.75rem] w-full pl-10"
              autocomplete="off"
            >
          </motion.div>
        </div>
        <div class="flex min-w-0 flex-col gap-1.5">
          <span class="sv-section-title">Status</span>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex min-h-[2.75rem] items-center rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="statusFilter === 'all' ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/60'"
              @click="statusFilter = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="inline-flex min-h-[2.75rem] items-center rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="statusFilter === 'active' ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/60'"
              @click="statusFilter = 'active'"
            >
              Active
            </button>
            <button
              type="button"
              class="inline-flex min-h-[2.75rem] items-center rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="statusFilter === 'inactive' ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/60'"
              @click="statusFilter = 'inactive'"
            >
              Inactive
            </button>
          </div>
        </div>
      </FilterBar>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <IntegrationConnectionCard
          v-for="item in filteredItems"
          :key="item.slug"
          :item="item"
          :logo-src="connectorLogoUrl(item.logo_file)"
          :can-connect="canConnect(item)"
          :can-deactivate="canDeactivate(item)"
          :connect-busy="connectBusySlug === item.slug"
          :deactivate-busy="deactivateBusyId === item.connection_id"
          :show-sign-in-hint="!loggedIn || !api.hasBase"
          @connect="connect(item)"
          @deactivate="deactivate(item)"
        />
      </div>

      <SurfaceCard
        v-if="!filteredItems.length && integrations.length"
        variant="soft"
        padding="md"
        class="border border-dashed border-black/12"
      >
        <p class="text-[13px] text-black/55">
          No integrations match your search or filters.
        </p>
      </SurfaceCard>
    </template>
  </motion.div>
</template>
