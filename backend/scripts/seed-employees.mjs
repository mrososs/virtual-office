#!/usr/bin/env node
/**
 * Approves iSaned team members for the Virtual Office.
 *
 *   npm run seed:employees -w backend                        # seed/employees.json
 *   npm run seed:employees -w backend -- seed/other.json --dry-run
 *
 * Upserts by normalized email, so re-running is safe and never duplicates
 * anyone: display name and role are set; job title, team, discipline, desk and
 * isActive are set when present (a null job title / team / discipline clears
 * it). `role` is the authorization role; `jobTitle` is what the person does
 * and is what the UI shows. Unknown fields are rejected, so a token can never
 * be slipped into a seed file.
 *
 * Sign-in identity links are never touched: the Azure DevOps identity
 * (AUTH_PROVIDER=azure_pat) or the Microsoft Entra link (entra_object_id /
 * entra_tenant_id) is recorded on the employee's first sign-in, so the email
 * here must be the one Azure DevOps shows for that person. The app stores no
 * passwords. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from backend/.env.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { EMPLOYEE_ROLES, isHqDeskId } from '@virtual-office/shared';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = resolve(args.find((arg) => !arg.startsWith('--')) ?? 'seed/employees.json');

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

let entries;
try {
  entries = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  fail(`Cannot read ${file}: ${error.message}\n  Copy seed/employees.example.json to seed/employees.json and list your team.`);
}
if (!Array.isArray(entries)) fail(`${file} must contain a JSON array of employees`);

const seen = new Set();
const desks = new Set();
const ALLOWED_FIELDS = new Set(['email', 'displayName', 'role', 'jobTitle', 'team', 'discipline', 'deskId', 'isActive']);
// Descriptive fields (never authorization). Omitted → left as is; null → cleared.
const PROFILE_FIELDS = { jobTitle: { column: 'job_title', max: 80 }, team: { column: 'team', max: 60 }, discipline: { column: 'discipline', max: 80 } };

function profileValue(entry, field, where) {
  const value = entry[field];
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || !value.trim()) fail(`${where}: ${field} must be a non-empty string or null`);
  if (value.trim().length > PROFILE_FIELDS[field].max) fail(`${where}: ${field} is longer than ${PROFILE_FIELDS[field].max} characters`);
  return value.trim();
}

const employees = entries.map((entry, index) => {
  const where = `entry ${index + 1}`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${where}: must be an object`);
  // Seed files only ever hold who someone is — never tokens or other secrets.
  for (const key of Object.keys(entry)) if (!ALLOWED_FIELDS.has(key)) fail(`${where}: unknown field "${key}" (allowed: ${[...ALLOWED_FIELDS].join(', ')})`);
  const email = typeof entry.email === 'string' ? entry.email.trim().toLowerCase() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`${where}: invalid email "${entry.email}"`);
  if (seen.has(email)) fail(`${where}: duplicate email ${email}`);
  seen.add(email);
  const displayName = typeof entry.displayName === 'string' ? entry.displayName.trim() : '';
  if (!displayName) fail(`${where} (${email}): displayName is required`);
  if (!EMPLOYEE_ROLES.includes(entry.role)) fail(`${where} (${email}): role must be one of ${EMPLOYEE_ROLES.join(', ')}`);
  if (entry.deskId !== undefined && entry.deskId !== null) {
    if (!isHqDeskId(entry.deskId)) fail(`${where} (${email}): unknown desk "${entry.deskId}" (see shared/src/domain/hq-floor-plan.ts)`);
    if (desks.has(entry.deskId)) fail(`${where} (${email}): desk ${entry.deskId} is assigned twice`);
    desks.add(entry.deskId);
  }
  if (entry.isActive !== undefined && typeof entry.isActive !== 'boolean') fail(`${where} (${email}): isActive must be true or false`);
  const profile = Object.fromEntries(Object.keys(PROFILE_FIELDS).map((field) => [field, profileValue(entry, field, `${where} (${email})`)]));
  return { email, displayName, role: entry.role, ...profile, deskId: entry.deskId ?? undefined, isActive: entry.isActive };
});

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  if (!dryRun) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  for (const employee of employees) console.log(`[dry-run] ${employee.email.padEnd(36)} ${employee.role.padEnd(16)} ${employee.deskId ?? '(desk auto-assigned on first sign-in)'}`);
  console.log(`\nDry run: ${employees.length} employee(s) valid. (No database configured, so create/update was not checked.)`);
  process.exit(0);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: readError } = await supabase.from('employees').select('id, email, assigned_desk_id');
if (readError) fail(`Could not read employees: ${readError.message}`);
const byEmail = new Map(existing.map((row) => [row.email, row]));

let created = 0;
let updated = 0;
for (const employee of employees) {
  const row = {
    email: employee.email,
    display_name: employee.displayName,
    role: employee.role,
    ...Object.fromEntries(Object.entries(PROFILE_FIELDS).filter(([field]) => employee[field] !== undefined).map(([field, { column }]) => [column, employee[field]])),
    ...(employee.deskId !== undefined ? { assigned_desk_id: employee.deskId } : {}),
    ...(employee.isActive !== undefined ? { is_active: employee.isActive } : {}),
  };
  const current = byEmail.get(employee.email);
  const action = current ? 'update' : 'create';
  console.log(`${dryRun ? '[dry-run] ' : ''}${action.padEnd(6)} ${employee.email.padEnd(36)} ${employee.role.padEnd(16)} ${(employee.jobTitle ?? '').padEnd(24)} ${employee.deskId ?? '(desk auto-assigned on first sign-in)'}`);
  if (dryRun) continue;

  const { error } = current
    ? await supabase.from('employees').update(row).eq('id', current.id)
    : await supabase.from('employees').insert(row);
  if (error) fail(`${employee.email}: ${error.message}`);
  if (current) updated += 1;
  else created += 1;
}

console.log(dryRun ? `\nDry run: ${employees.length} employee(s) validated, nothing written.` : `\n✔ ${created} created, ${updated} updated.`);
