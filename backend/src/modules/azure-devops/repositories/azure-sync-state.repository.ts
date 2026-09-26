import { Injectable } from '@nestjs/common';
import type { AzureSyncRunStatus, UUID } from '@virtual-office/shared';
import { unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';

export interface AzureSyncState {
  status: AzureSyncRunStatus | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessAt: string | null;
  error: string | null;
  syncedByEmployeeId: UUID | null;
  projectName: string | null;
  teamName: string | null;
  iterationId: string | null;
  iterationName: string | null;
  iterationStart: string | null;
  iterationEnd: string | null;
  workItemCount: number;
  pullRequestCount: number;
  buildCount: number;
}

interface Row {
  status: AzureSyncRunStatus | null;
  started_at: string | null;
  finished_at: string | null;
  last_success_at: string | null;
  error: string | null;
  synced_by_employee_id: string | null;
  project_name: string | null;
  team_name: string | null;
  iteration_id: string | null;
  iteration_name: string | null;
  iteration_start: string | null;
  iteration_end: string | null;
  work_item_count: number;
  pull_request_count: number;
  build_count: number;
}

export interface AzureSyncSuccess {
  finishedAt: string;
  employeeId: UUID;
  project: { id: string; name: string };
  team: { id: string; name: string };
  iteration: { id: string; name: string; path: string; start: string | null; end: string | null } | null;
  counts: { workItems: number; pullRequests: number; builds: number };
}

/** The single `azure_sync_state` row (id = 1): what the latest run did. */
@Injectable()
export class AzureSyncStateRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('azure_sync_state');
  }

  async get(): Promise<AzureSyncState> {
    const row = unwrap(await this.table.select('*').eq('id', 1).maybeSingle<Row>(), 'azure_sync_state.get');
    return {
      status: row?.status ?? null,
      startedAt: row?.started_at ?? null,
      finishedAt: row?.finished_at ?? null,
      lastSuccessAt: row?.last_success_at ?? null,
      error: row?.error ?? null,
      syncedByEmployeeId: row?.synced_by_employee_id ?? null,
      projectName: row?.project_name ?? null,
      teamName: row?.team_name ?? null,
      iterationId: row?.iteration_id ?? null,
      iterationName: row?.iteration_name ?? null,
      iterationStart: row?.iteration_start ?? null,
      iterationEnd: row?.iteration_end ?? null,
      workItemCount: row?.work_item_count ?? 0,
      pullRequestCount: row?.pull_request_count ?? 0,
      buildCount: row?.build_count ?? 0,
    };
  }

  async markRunning(startedAt: string): Promise<void> {
    unwrap(await this.table.upsert({ id: 1, status: 'RUNNING', started_at: startedAt, error: null }), 'azure_sync_state.markRunning');
  }

  async markSucceeded(result: AzureSyncSuccess): Promise<void> {
    unwrap(
      await this.table.upsert({
        id: 1,
        status: 'SUCCEEDED',
        finished_at: result.finishedAt,
        last_success_at: result.finishedAt,
        error: null,
        synced_by_employee_id: result.employeeId,
        project_id: result.project.id,
        project_name: result.project.name,
        team_id: result.team.id,
        team_name: result.team.name,
        iteration_id: result.iteration?.id ?? null,
        iteration_name: result.iteration?.name ?? null,
        iteration_path: result.iteration?.path ?? null,
        iteration_start: result.iteration?.start ?? null,
        iteration_end: result.iteration?.end ?? null,
        work_item_count: result.counts.workItems,
        pull_request_count: result.counts.pullRequests,
        build_count: result.counts.builds,
      }),
      'azure_sync_state.markSucceeded',
    );
  }

  async markFailed(error: string): Promise<void> {
    unwrap(
      await this.table.upsert({ id: 1, status: 'FAILED', finished_at: new Date().toISOString(), error: error.slice(0, 500) }),
      'azure_sync_state.markFailed',
    );
  }
}
