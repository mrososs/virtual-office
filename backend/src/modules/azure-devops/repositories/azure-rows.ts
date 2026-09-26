import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrap } from '../../../common/supabase/database.error';

/** `public.azure_work_items` */
export interface AzureWorkItemRow {
  work_item_id: number;
  title: string;
  work_item_type: string;
  state: string;
  assigned_to_identity_id: string | null;
  assigned_to_unique_name: string | null;
  assigned_to_display_name: string | null;
  assigned_employee_id: string | null;
  iteration_path: string | null;
  tags: string[];
  url: string;
  changed_at: string;
  synced_at: string;
}

export interface AzurePullRequestReviewerJson {
  identityId: string;
  uniqueName: string;
  displayName: string;
  vote: number;
  isRequired: boolean;
  employeeId: string | null;
}

/** `public.azure_pull_requests` */
export interface AzurePullRequestRow {
  pull_request_id: number;
  repository_id: string;
  repository_name: string;
  title: string;
  status: string;
  is_draft: boolean;
  created_by_identity_id: string | null;
  created_by_unique_name: string | null;
  created_by_display_name: string | null;
  author_employee_id: string | null;
  reviewers: AzurePullRequestReviewerJson[];
  reviewer_employee_ids: string[];
  source_ref: string | null;
  target_ref: string | null;
  created_at_azure: string;
  closed_at: string | null;
  url: string;
  synced_at: string;
}

/** `public.azure_builds` */
export interface AzureBuildRow {
  build_id: number;
  build_number: string;
  pipeline_id: number | null;
  pipeline_name: string;
  status: string;
  result: string | null;
  requested_for_identity_id: string | null;
  requested_for_unique_name: string | null;
  requested_for_display_name: string | null;
  requested_for_employee_id: string | null;
  source_branch: string | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  url: string;
  synced_at: string;
}

/**
 * Mirrors one sync run into a table: upsert every row seen (stamped with the
 * run's start time), then delete rows the run did not see. Tables therefore
 * always describe "now" and never accumulate history.
 */
export async function replaceTableRows<Row extends { synced_at: string }>(
  client: SupabaseClient,
  table: string,
  primaryKey: keyof Row & string,
  rows: Row[],
  runStartedAt: string,
): Promise<void> {
  if (rows.length > 0) {
    unwrap(await client.from(table).upsert(rows, { onConflict: primaryKey }), `${table}.upsert`);
  }
  unwrap(await client.from(table).delete().lt('synced_at', runStartedAt), `${table}.deleteStale`);
}
