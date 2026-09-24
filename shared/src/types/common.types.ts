/**
 * Primitive types shared across every domain model.
 */

export type ISODateString = string;

export type UUID = string;

export interface Vector2 {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
