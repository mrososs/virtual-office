/**
 * Phaser-side-only types — not domain data, so they do not belong in
 * `@virtual-office/shared`.
 */
export interface MovementInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const NO_MOVEMENT_INPUT: Readonly<MovementInputState> = { up: false, down: false, left: false, right: false };
