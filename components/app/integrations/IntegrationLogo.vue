<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string;
    /** Two-letter override (e.g. "Me" for Meta). */
    initials?: string;
    /**
     * Full URL to a raster logo (e.g. API `/assets/images/integrations/{file}`).
     * When missing or load fails, initials are shown.
     */
    logoSrc?: string;
  }>(),
  { initials: undefined, logoSrc: undefined },
);

const imgFailed = ref(false);

watch(
  () => props.logoSrc,
  () => {
    imgFailed.value = false;
  },
);

const display = computed(() => {
  if (props.initials?.trim()) return props.initials.trim().slice(0, 2).toUpperCase();
  const parts = props.name.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
  const w = parts[0] || "?";
  return w.slice(0, 2).toUpperCase();
});

const hue = computed(() => {
  let h = 0;
  for (let i = 0; i < props.name.length; i += 1) h = (h * 31 + props.name.charCodeAt(i)) >>> 0;
  return 200 + (h % 120);
});

const showImage = computed(
  () => Boolean(props.logoSrc?.trim()) && !imgFailed.value,
);
</script>

<template>
  <div
    class="integration-logo relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.08] text-[12px] font-bold tracking-tight text-black/80 shadow-sm"
    :class="showImage ? 'bg-white' : ''"
    :style="
      showImage
        ? {}
        : {
            background: `linear-gradient(145deg, hsla(${hue}, 42%, 96%, 1) 0%, hsla(${hue}, 35%, 88%, 0.65) 100%)`,
          }
    "
    aria-hidden="true"
  >
    <img
      v-if="showImage"
      :src="logoSrc"
      alt=""
      class="h-full w-full object-contain p-1"
      loading="lazy"
      decoding="async"
      @error="imgFailed = true"
    >
    <span v-else>{{ display }}</span>
  </div>
</template>
