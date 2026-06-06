/**
 * Fetches and exposes the current workspace's credit balance.
 * Used to show remaining credits before a simulation run.
 */
export function useBillingCredit() {
  const api = useApiClient();
  const workspace = useWorkspaceContext();

  const creditsRemaining = ref<number | null>(null);
  const creditsAllowance = ref<number | null>(null);
  const creditLoading = ref(false);

  async function refreshCredit() {
    const workspaceId = workspace.currentWorkspaceId.value;
    if (!workspaceId || !api.hasBase.value) {
      creditsRemaining.value = null;
      return;
    }
    creditLoading.value = true;
    try {
      const res = await api.getJson<{
        credits_remaining: number;
        usage: { credits: { allowance: number; used: number } };
      }>(`/billing/workspaces/${encodeURIComponent(workspaceId)}/billing`);
      creditsRemaining.value = res.credits_remaining ?? null;
      creditsAllowance.value = res.usage?.credits?.allowance ?? null;
    } catch {
      creditsRemaining.value = null;
    } finally {
      creditLoading.value = false;
    }
  }

  watch(
    () => workspace.currentWorkspaceId.value,
    () => void refreshCredit(),
    { immediate: true },
  );

  const creditLabel = computed(() => {
    if (creditsRemaining.value === null) return null;
    return `${creditsRemaining.value} credits remaining`;
  });

  return {
    creditsRemaining,
    creditsAllowance,
    creditLoading,
    creditLabel,
    refreshCredit,
  };
}
