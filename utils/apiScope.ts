/**
 * Canonical API scope query/body fields for tab endpoints.
 */
export function brandScopeQuery(workspaceId: string, brandprofileId: string): string {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    brandprofile_id: brandprofileId,
  });
  return `?${params.toString()}`;
}

export function workspaceScopeQuery(workspaceId: string): string {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  return `?${params.toString()}`;
}

export function brandScopeBody(workspaceId: string, brandprofileId: string) {
  return {
    workspace_id: workspaceId,
    brandprofile_id: brandprofileId,
  };
}
