/**
 * The Azure DevOps token the Virtual Office needs: read-only, one organization.
 * Scope names as the Azure DevOps "New Token" dialog shows them.
 */
export interface PatScope {
  area: string;
  access: 'Read';
  why: string;
}

export const REQUIRED_PAT_SCOPES: readonly PatScope[] = [
  { area: 'Work Items', access: 'Read', why: 'your sprint, tasks and bugs' },
  { area: 'Code', access: 'Read', why: 'pull requests and reviewers (never file contents)' },
  { area: 'Build', access: 'Read', why: 'running and recent builds' },
  { area: 'Project and Team', access: 'Read', why: 'the project, team and its members' },
];

/** Where people create tokens: https://dev.azure.com/<org>/_usersSettings/tokens */
export function personalAccessTokensUrl(organization: string | null): string {
  return organization ? `https://dev.azure.com/${encodeURIComponent(organization)}/_usersSettings/tokens` : 'https://dev.azure.com';
}
