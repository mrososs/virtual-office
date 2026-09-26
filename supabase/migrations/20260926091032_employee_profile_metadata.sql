-- iSaned Virtual Office — what each employee does, separate from what they may do.
--
-- `role` stays the application's authorization role (GENERAL_MANAGER …
-- QA). These columns describe the person for the office UI: their job title
-- ("Mobile Flutter Developer"), the team they belong to ("Mobile
-- Development") and, optionally, their discipline ("Flutter / Mobile
-- Development"). All three are managed by the employee seed; sign-in never
-- writes them.
--
-- Additive only: three nullable columns without defaults (no table rewrite)
-- plus length/blank checks. Access is unchanged: RLS stays on with no
-- policies and table grants remain service_role only, so the new columns are
-- reachable only through the NestJS backend. No data is changed or removed.

alter table public.employees
  add column job_title  text,
  add column team       text,
  add column discipline text;

comment on column public.employees.job_title is
  'What the employee does, shown in the UI (e.g. "Developer / Team Lead"). Never used for authorization — see role.';
comment on column public.employees.team is
  'Organizational group, e.g. "Development", "QA", "Design". Groups the Team panel.';
comment on column public.employees.discipline is
  'Optional specialism, e.g. "Flutter / Mobile Development".';

alter table public.employees
  add constraint employees_job_title_valid
    check (job_title is null or (btrim(job_title) = job_title and job_title <> '' and char_length(job_title) <= 80)),
  add constraint employees_team_valid
    check (team is null or (btrim(team) = team and team <> '' and char_length(team) <= 60)),
  add constraint employees_discipline_valid
    check (discipline is null or (btrim(discipline) = discipline and discipline <> '' and char_length(discipline) <= 80));
