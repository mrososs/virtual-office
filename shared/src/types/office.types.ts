import type { UUID, Vector2 } from './common.types.js';

export interface Office {
  id: UUID;
  organizationId: UUID;
  name: string;
  defaultFloorId?: UUID;
}

export interface OfficeFloor {
  id: UUID;
  officeId: UUID;
  name: string;
  mapKey: string;
  order: number;
}

export type OfficeObjectType = 'FURNITURE' | 'DECORATION' | 'INTERACTIVE' | 'SIGNAGE';

export interface OfficeObject {
  id: UUID;
  officeId: UUID;
  floorId?: UUID;
  type: OfficeObjectType;
  assetKey: string;
  position: Vector2;
  rotation?: number;
}

export interface Furniture extends OfficeObject {
  type: 'FURNITURE';
  isWalkable: boolean;
  isInteractive: boolean;
}

export interface SpawnPoint {
  id: UUID;
  officeId: UUID;
  floorId?: UUID;
  position: Vector2;
  label?: string;
}
