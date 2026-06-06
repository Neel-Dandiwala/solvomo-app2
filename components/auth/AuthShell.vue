<script>
export default defineNuxtComponent({
  name: "AuthShell",
  props: {
    alternateHref: { type: String, default: "" },
    alternateLabel: { type: String, default: "" },
  },
  data() {
    return {
      scrolled: false,
    };
  },
  mounted() {
    this.onScroll();
    window.addEventListener("scroll", this.onScroll, { passive: true });
  },
  unmounted() {
    window.removeEventListener("scroll", this.onScroll);
  },
  methods: {
    onScroll() {
      this.scrolled = window.scrollY > 10;
    },
  },
});
</script>

<template>
  <div
    class="page-haze flex min-h-svh flex-col bg-white text-black antialiased"
  >
    <header
      class="sticky top-0 z-50 shrink-0 border-b transition-colors duration-200"
      :class="
        scrolled
          ? 'border-black/10 bg-white/92 backdrop-blur-md'
          : 'border-transparent bg-white/88 backdrop-blur-md'
      "
    >
      <div
        class="mx-auto flex min-h-[5rem] w-full max-w-[110rem] items-center justify-between gap-6 px-6 py-3 sm:min-h-[5.5rem] sm:px-9 lg:px-14"
      >
        <NuxtLink to="/" class="flex items-center gap-3">
          <div class="logo-mark-color h-9 w-9 shrink-0 sm:h-10 sm:w-10">
            <img
              src="~/assets/images/logo/colour_logo.jpeg"
              alt="Solvomo logo"
              class="h-full w-full"
            />
          </div>
          <span class="brand-wordmark text-[1.125rem] sm:text-[1.2rem]">Solvomo</span>
        </NuxtLink>

        <nav class="flex items-center gap-6 sm:gap-8" aria-label="Auth">
          <NuxtLink to="/" class="nav-link hidden text-base font-medium sm:inline">
            Home
          </NuxtLink>
          <NuxtLink
            v-if="alternateHref && alternateLabel"
            :to="alternateHref"
            class="nav-link text-base font-medium"
          >
            {{ alternateLabel }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main
      class="hero-backdrop flex flex-1 flex-col border-b border-black/10"
    >
      <div
        class="mx-auto flex w-full max-w-[110rem] flex-1 flex-col justify-center px-6 py-16 sm:px-9 sm:py-24 lg:px-14 lg:py-28"
      >
        <div
          class="grid w-full gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(40rem,48rem)] lg:items-center lg:gap-18 xl:gap-24"
        >
          <div class="max-w-3xl lg:max-w-none">
            <slot name="aside" />
          </div>
          <div class="min-w-0 w-full lg:max-w-[42rem]">
            <slot />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
