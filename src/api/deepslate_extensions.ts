
// fix: patch deepslate to expose private fields
import { BlockDefinition, BlockModel } from 'deepslate';
import { Identifier } from 'deepslate/core';

declare type ModelVariant = {
  model: string;
  x?: number;
  y?: number;
  uvlock?: boolean;
};
declare type ModelVariantEntry = ModelVariant | (ModelVariant & {
  weight?: number;
})[];
declare type ModelMultiPartCondition = {
  OR?: ModelMultiPartCondition[];
  AND?: ModelMultiPartCondition[];
} | {
  [key: string]: string;
};
declare type ModelMultiPart = {
  when?: ModelMultiPartCondition;
  apply: ModelVariantEntry;
};

export function describeBlockDefinition (def: BlockDefinition): { variants: {
  [key: string]: ModelVariantEntry;
} | undefined; multipart: ModelMultiPart[] | undefined; } {
  const d = def;
  return {
    variants: d.variants,
    multipart: d.multipart
  };
}

export function blockModelHasGeometry (model: BlockModel): boolean {
  return model.elements && model.elements.length > 0;
}

// fix: generate types for asset jsons
export function createBlockModelFromJson (data: any, name: Identifier): BlockModel {
  const parent = data.parent ? Identifier.parse(data.parent) : undefined;
  const textures = data.textures ?? {};
  const elements = data.elements;
  const display = data.display;
  const guiLight = data.gui_light;
  return new BlockModel(parent, textures, elements as any, display as any, guiLight as any);
}

