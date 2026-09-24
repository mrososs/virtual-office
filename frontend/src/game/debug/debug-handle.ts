import type { PlayerControlMode, UUID } from '@virtual-office/shared';

export interface OfficeDebugSnapshot {
  avatars: Array<{
    employeeId: UUID;
    x: number;
    y: number;
    hidden: boolean;
    controller: string;
    controlMode: PlayerControlMode;
    navigating: boolean;
    roomId: UUID | null;
  }>;
  occupancy: Record<UUID, UUID[]>;
  /** World → CSS px: cssX = canvasLeft + (worldX - camera.x) * camera.scale. */
  camera: { x: number; y: number; scale: number };
}

declare global {
  interface Window {
    __VO_OFFICE__?: { snapshot: () => OfficeDebugSnapshot | null; scene: unknown };
  }
}

/**
 * Development-only inspection hook for runtime testing (`window.__VO_OFFICE__.snapshot()`).
 * Compiled out of production builds via `import.meta.env.DEV`.
 */
export function installDebugHandle(read: () => OfficeDebugSnapshot | null, scene: unknown): () => void {
  if (!import.meta.env.DEV) return () => undefined;
  window.__VO_OFFICE__ = { snapshot: read, scene };
  return () => {
    if (window.__VO_OFFICE__?.snapshot === read) delete window.__VO_OFFICE__;
  };
}
