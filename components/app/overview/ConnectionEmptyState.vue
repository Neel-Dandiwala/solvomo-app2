<script setup lang="ts">
import { BarChart3, Database, PlugZap, Sparkles } from "lucide-vue-next";
</script>

<template>
  <SurfaceCard variant="soft" padding="lg" class="overflow-hidden border border-black/[0.06]">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-center">
      <div>
        <p class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-[12px] font-semibold text-black/55">
          <PlugZap class="h-3.5 w-3.5 text-[rgba(91,123,225,0.85)]" :stroke-width="1.9" />
          Connect data
        </p>
        <h2 class="mt-5 max-w-xl text-[2rem] font-semibold leading-[1.05] tracking-[-0.05em] text-black">
          Start by creating connections to unlock dashboards.
        </h2>
        <p class="mt-4 max-w-2xl text-[15px] leading-7 text-black/58">
          Connect ad, analytics, and commerce sources so Solvomo can build factual dashboards from your live data.
        </p>
        <NuxtLink to="/app/connections" class="app-button button-primary mt-6 text-sm">
          Create connection
        </NuxtLink>
      </div>

      <div class="relative min-h-[17rem] rounded-[2rem] border border-black/[0.06] bg-white/80 p-5 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.38)]">
        <div class="absolute left-6 top-6 rounded-2xl border border-black/[0.08] bg-black/[0.025] p-4">
          <Database class="h-6 w-6 text-black/45" :stroke-width="1.8" />
        </div>
        <div class="absolute right-7 top-10 rounded-2xl border border-[rgba(91,123,225,0.18)] bg-[rgba(91,123,225,0.06)] p-4">
          <Sparkles class="h-6 w-6 text-[rgba(91,123,225,0.75)]" :stroke-width="1.8" />
        </div>
        <div class="absolute bottom-7 left-8 right-8 rounded-[1.35rem] border border-black/[0.08] bg-white p-4">
          <div class="mb-4 flex items-center justify-between">
            <div class="h-2.5 w-24 rounded-full bg-black/10" />
            <BarChart3 class="h-4 w-4 text-black/35" :stroke-width="1.9" />
          </div>
          <div class="flex h-24 items-end gap-2">
            <div class="h-10 flex-1 rounded-t-xl bg-[rgba(91,123,225,0.18)]" />
            <div class="h-16 flex-1 rounded-t-xl bg-[rgba(244,114,91,0.18)]" />
            <div class="h-20 flex-1 rounded-t-xl bg-[rgba(14,165,190,0.16)]" />
            <div class="h-12 flex-1 rounded-t-xl bg-black/[0.08]" />
          </div>
        </div>
      </div>
    </div>
  </SurfaceCard>
</template>
