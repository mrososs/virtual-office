/**
 * What someone does in the team. Business data only — it never decides how
 * their avatar looks (that is `AvatarProfile`, see avatar.types.ts).
 *
 * Per-role behavior (labels, default work area, ordering) is data in
 * `ROLE_CONFIG` (domain/role-config.ts). Adding a role means adding it here
 * and giving it a config entry; never branch on role values elsewhere.
 */
export type EmployeeRole = 'GENERAL_MANAGER' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'DEVELOPER' | 'QA';
