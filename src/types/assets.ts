import { ObjMeshPart } from '../api/obj_loader.js';
import type { Direction } from 'deepslate/core';

export interface RawModelElementRotation {
  origin: [number, number, number];
  axis: 'x' | 'y' | 'z';
  angle: number;
  rescale?: boolean;
}

export interface RawModelFace {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: Direction;
  rotation?: 0 | 90 | 180 | 270;
  tintindex?: number;
}

export interface RawModelElement {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: RawModelElementRotation;
  faces: Partial<Record<Direction, RawModelFace>>;
  shade?: boolean;
  name?: string; // Debug/structure helper
  children?: RawModelElement[]; // For Create mod composite elements
}

export interface RawModelDisplayPosition {
  rotation?: [number, number, number];
  translation?: [number, number, number];
  scale?: [number, number, number];
}

export type ReferenceFrame =
  | 'thirdperson_righthand'
  | 'thirdperson_lefthand'
  | 'firstperson_righthand'
  | 'firstperson_lefthand'
  | 'gui'
  | 'head'
  | 'ground'
  | 'fixed';

export interface RawBlockModel {
  parent?: string;
  ambientocclusion?: boolean;
  display?: Partial<Record<ReferenceFrame, RawModelDisplayPosition>>;
  textures?: Record<string, string>;
  elements?: (RawModelElement | ObjMeshPart)[];
  loader?: string; // Forge/Fabric extension
  model?: string; // Forge extension for OBJ model path
  particle?: string; // Sometimes particle is at root
  render_type?: string; // Fabric extension
  children?: Record<string, RawBlockModel>; // Create composite models
}

export interface RawBlockStateVariant {
  model: string;
  x?: number;
  y?: number;
  uvlock?: boolean;
  weight?: number;
}

export type RawMultipartWhenCondition = Record<string, string>;

export interface RawMultipartWhenOR {
  OR: RawMultipartWhenCondition[];
}

export type RawMultipartWhen = RawMultipartWhenCondition | RawMultipartWhenOR;

export interface RawMultipartCase {
  when?: RawMultipartWhen;
  apply: RawBlockStateVariant | RawBlockStateVariant[];
}

export interface RawBlockState {
  variants?: Record<string, RawBlockStateVariant | RawBlockStateVariant[]>;
  multipart?: RawMultipartCase[];
}
