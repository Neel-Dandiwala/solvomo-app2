<script setup lang="ts">
const route = useRoute();

void navigateTo({
  path: "/",
  query: route.query,
}, { replace: true });
</script>
