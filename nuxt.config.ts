import { vueRenderSlotNullGuard } from "./vite/vue-render-slot-null-guard";
import { vueRouterDevtoolsNullGuard } from "./vite/vue-router-devtools-null-guard";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  runtimeConfig: {
    apiProxyTarget:
      process.env.NUXT_API_PROXY_TARGET?.trim() || "http://localhost:8000",
    public: {
      /**
       * Same-origin API base. Nitro proxies `/api/**` to the Fastify API.
       */
      apiBase: process.env.NUXT_PUBLIC_API_BASE?.trim() || "/api",
    },
  },
  devtools: { enabled: true },
  // Auth/marketing UI only: avoid SSR↔client tree mismatches (RouterView/Suspense/Safari).
  ssr: false,
  css: ["~/assets/css/main.css"],
  modules: ["@nuxtjs/tailwindcss", "nuxt-auth-utils"],
  nitro: {
    routeRules: {
      // Hashed assets are safe to cache forever; mismatched HTML + old preload hints cause chunk import failures.
      "/_nuxt/**": {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      },
      // SPA HTML responses (all routes): revalidate so chunk preloads match the deployed manifest.
      "/**": {
        headers: { "cache-control": "no-cache, private, must-revalidate" },
      },
    },
  },
  vite: {
    plugins: [vueRenderSlotNullGuard(), vueRouterDevtoolsNullGuard()],
    resolve: {
      dedupe: ["vue"],
      alias: {
        // Client bundle: import.meta.server is false, but Vite still resolves
        // import("#app-manifest") in the unused branch. Stub satisfies analysis.
        // https://github.com/nuxt/nuxt/issues/30461
        "#app-manifest": "unenv/mock/empty",
      },
    },
  },
  app: {
    head: {
      title: "Solvomo — Sign in",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        {
          name: "description",
          content: "Decision intelligence for growth operators.",
        },
        { name: "theme-color", content: "#FFFFFF" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          sizes: "512x512",
          href: "/favicon.png",
        },
      ],
    },
  },
});
