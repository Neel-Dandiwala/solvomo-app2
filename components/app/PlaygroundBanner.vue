<script setup lang="ts">
const { brandProfiles, currentWorkspaceId, setBrandProfile } = useWorkspaceContext();

function switchToProduction() {
  const ws = currentWorkspaceId.value;
  const prod = brandProfiles.value.find((b) => b.workspaceId === ws && !b.isPlaygroundSystem);
  if (prod) setBrandProfile(prod.id);
}
</script>

<template>
  <div
    class="playground-banner surface-product flex flex-wrap items-center justify-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 text-center sm:justify-between sm:text-left"
    role="status"
    aria-live="polite"
  >
    <p class="max-w-4xl text-sm font-semibold text-black/80">
      <span class="eyebrow mr-2 rounded-full">
        <span class="eyebrow-dot" />
        Sandbox
      </span>
      You are in the sandbox workspace. Changes here do not affect production reporting.
    </p>
    <button
      type="button"
      class="button-secondary shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
      @click="switchToProduction"
    >
      Switch to production
    </button>
  </div>
</template>
