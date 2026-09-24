import type { Employee } from '@virtual-office/shared';

/**
 * API response shape for an employee. For this scaffold it is a direct
 * pass-through of the shared `Employee` domain type; kept as its own DTO
 * so the HTTP contract can diverge from the internal domain model later
 * (e.g. hiding internal fields, adding computed ones) without touching
 * `@virtual-office/shared`.
 */
export type EmployeeResponseDto = Employee;
