/**
 * Delegated permissions, requested incrementally: sign-in asks only for the
 * OpenID Connect basics; Azure DevOps read scopes are consented when an
 * employee connects Azure DevOps from the Integrations page.
 */

/** Sign-in: identity + a refresh token for later incremental consent. No resource API permissions. */
export const SIGN_IN_SCOPES = ['openid', 'profile', 'email', 'offline_access'];

/** Azure DevOps' Microsoft Entra resource (https://app.vssps.visualstudio.com). */
export const AZURE_DEVOPS_RESOURCE_ID = '499b84ac-1321-427f-aa17-267ca6975798';

/**
 * Least privilege for the read-only office: profile (identity mapping),
 * project & team (teams, members), work (work items, iterations), code (pull
 * request metadata — the app never reads file contents) and build (runs).
 * No write scopes and no `user_impersonation`.
 */
export const AZURE_DEVOPS_SCOPES = ['vso.profile', 'vso.project', 'vso.work', 'vso.code', 'vso.build'].map(
  (scope) => `${AZURE_DEVOPS_RESOURCE_ID}/${scope}`,
);

/**
 * Next phase — defined, never requested yet: Microsoft Graph delegated
 * calendar access (Teams meetings arrive as events with `onlineMeeting.joinUrl`),
 * consented the same incremental way from the Integrations page. Add
 * `OnlineMeetings.Read` only if metadata beyond the calendar event is needed.
 */
export const GRAPH_CALENDAR_SCOPES = ['https://graph.microsoft.com/Calendars.Read'];
