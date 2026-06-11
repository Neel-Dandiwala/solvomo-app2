<script setup lang="ts">
defineProps<{
  /** 0 = about you, 1 = brand profile */
  activeIndex: number;
}>();

const steps = [
  { key: "you", label: "About you" },
  { key: "brand", label: "Brand profile" },
] as const;
</script>

<template>
  <nav class="rounded-2xl border border-black/8 bg-white/95 px-4 py-4 sm:px-6 sm:py-5" aria-label="Onboarding progress">
    <ol class="grid gap-6 sm:grid-cols-2">
      <li
        v-for="(s, i) in steps"
        :key="s.key"
        class="flex gap-3 border-l border-black/6 pl-4 first:border-l-0 first:pl-0 sm:border-l sm:border-black/6 sm:pl-4 sm:first:border-l-0 sm:first:pl-0"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors"
          :class="
            i < activeIndex
              ? 'border-[rgba(91,123,225,0.35)] bg-[rgba(91,123,225,0.1)] text-[rgba(30,40,90,0.9)]'
              : i === activeIndex
                ? 'border-black bg-black text-white'
                : 'border-black/10 bg-white text-black/35'
          "
        >
          {{ i < activeIndex ? "✓" : i + 1 }}
        </span>
        <div class="min-w-0">
          <p
            class="text-sm font-semibold leading-tight"
            :class="i === activeIndex ? 'text-black' : i < activeIndex ? 'text-black/65' : 'text-black/40'"
          >
            {{ s.label }}
          </p>
        </div>
      </li>
    </ol>
  </nav>
</template>
