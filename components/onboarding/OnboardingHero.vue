<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
    <div>
      <p v-if="eyebrow" class="eyebrow rounded-full">
        <span class="eyebrow-dot" />
        {{ eyebrow }}
      </p>
      <h1 class="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl" :class="eyebrow ? 'mt-4' : ''">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 sm:text-[15px]">
        {{ description }}
      </p>
    </div>
    <SurfaceCard
      v-if="$slots.aside"
      variant="soft"
      padding="sm"
      class="rounded-2xl border border-black/8 lg:mt-1"
    >
      <slot name="aside" />
    </SurfaceCard>
  </section>
</template>
