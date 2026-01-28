import { BlockDefinition, BlockModel, Identifier, type Resources } from 'deepslate';
import { describeBlockDefinition, createBlockModelFromJson } from './deepslate_extensions';
import { mergeAtlases } from './atlas_merger.js';
import type { Structure, TextureAtlas } from 'deepslate';
import { CreateModLoader, type CreateModLoaderOptions, type LoadedAssets } from './create_loader.js';
import { loadCreateModelManifest, MODEL_MANIFEST_FILE } from './create_model_manifest.js';
import { RawBlockState, RawBlockModel } from '../types/assets.js';

type FetchFn = typeof fetch;

export interface VanillaAssetBundle {
  blockStates: Record<string, RawBlockState>;
  blockModels: Record<string, RawBlockModel>;
  uvMap: Record<string, [number, number, number, number]>;
  atlasImage: HTMLImageElement;
}

export interface ResourceLoadOptions extends CreateModLoaderOptions {
  vanillaBase?: string;
  summaryBase?: string;
  atlasBase?: string;
  fetchFn?: FetchFn;
}

const DEFAULT_VANILLA_BASE = './assets/minecraft/';
const DEFAULT_ASSETS_BASE = './assets/create';
const DEFAULT_SUMMARY_BASE = 'https://raw.githubusercontent.com/misode/mcmeta/summary/';
const DEFAULT_ATLAS_BASE = 'https://raw.githubusercontent.com/misode/mcmeta/atlas/';

const fetchJsonLocalFirst = async (fetchFn: FetchFn, localPath: string, remoteUrl: string) => {
  try {
    const r = await fetchFn(localPath);
    if (r.ok) {
      return await r.json();
    }
  } catch (e) {
    console.warn(`Local fetch failed for ${localPath}`, e);
  }
  const remote = await fetchFn(remoteUrl);
  if (!remote.ok) {
    throw new Error(`Failed to fetch ${remoteUrl}`);
  }
  return await remote.json();
};

const fetchImageLocalFirst = (fetchFn: FetchFn, localPath: string, remoteUrl: string) => new Promise<HTMLImageElement>((res, rej) => {
  const load = (src: string, fallback?: string) => {
    const image = new Image();
    image.onload = () => res(image);
    image.onerror = () => {
      if (fallback) {
        load(fallback);
      } else {
        rej(new Error(`Failed to load image ${src}`));
      }
    };
    image.crossOrigin = 'Anonymous';
    image.src = src;
  };
  load(localPath, remoteUrl);
});

export async function loadVanillaAssets (options: ResourceLoadOptions = {}): Promise<VanillaAssetBundle> {
  const fetchFn = options.fetchFn ?? fetch;
  const vanillaBase = options.vanillaBase ?? DEFAULT_VANILLA_BASE;
  const summaryBase = options.summaryBase ?? DEFAULT_SUMMARY_BASE;
  const atlasBase = options.atlasBase ?? DEFAULT_ATLAS_BASE;

  const [blockStates, blockModels, uvMap, atlasImage] = await Promise.all([
    fetchJsonLocalFirst(fetchFn, `${vanillaBase}block_definition.json`, `${summaryBase}assets/block_definition/data.min.json`),
    fetchJsonLocalFirst(fetchFn, `${vanillaBase}model.json`, `${summaryBase}assets/model/data.min.json`),
    fetchJsonLocalFirst(fetchFn, `${vanillaBase}atlas.json`, `${atlasBase}all/data.min.json`),
    fetchImageLocalFirst(fetchFn, `${vanillaBase}atlas.png`, `${atlasBase}all/atlas.png`)
  ]);

  return { blockStates, blockModels, uvMap, atlasImage };
}

export interface ResourceBundle {
  resources: Resources;
  blockDefinitions: Record<string, BlockDefinition>;
  blockModels: Record<string, BlockModel>;
  textureAtlas: TextureAtlas;
  autoSubparts: Array<{ blockId: string; baseModel: string; subpart: string; when?: Record<string, string> }>;
  loader: CreateModLoader;
}

export async function loadResourcesForStructure (structure: Structure, options: ResourceLoadOptions = {}): Promise<ResourceBundle> {
  const fetchFn = options.fetchFn ?? fetch;
  const assetsBase = options.assetsBase ?? DEFAULT_ASSETS_BASE;

  const vanillaPromise = loadVanillaAssets({ ...options, fetchFn });
  const manifestPromise = options.modelManifest
    ? Promise.resolve(undefined)
    : loadCreateModelManifest(assetsBase, fetchFn).catch(err => {
      console.warn(`[deepslate resources] Failed to load Create model manifest from ${assetsBase}/${MODEL_MANIFEST_FILE}`, err);
      return undefined;
    });

  const [vanilla, manifestData] = await Promise.all([vanillaPromise, manifestPromise]);

  const blocks = new Set<string>();
  structure.getBlocks().forEach(b => blocks.add(b.state.getName().toString()));

  const loaderOptions: CreateModLoaderOptions = {
    ...options,
    modelManifest: options.modelManifest ?? manifestData
  };
  const loader = new CreateModLoader(loaderOptions);
  const modAssets: LoadedAssets = await loader.loadBlocks(blocks);
  const atlas = await mergeAtlases(vanilla.atlasImage, vanilla.uvMap, modAssets.textures);

  const blockDefinitions: Record<string, BlockDefinition> = {};
  Object.keys(vanilla.blockStates).forEach(id => {
    blockDefinitions['minecraft:' + id] = BlockDefinition.fromJson(vanilla.blockStates[id]);
  });
  Object.keys(modAssets.blockDefinitions).forEach(id => {
    blockDefinitions[id] = modAssets.blockDefinitions[id];
  });

  const blockProperties: Record<string, Record<string, string[]>> = {};
  const defaultBlockProperties: Record<string, Record<string, string>> = {};

  const parseVariantKey = (variant: string) => {
    const out: Record<string, string> = {};
    if (!variant || variant.trim() === '') {
      return out;
    }
    variant.split(',').forEach(p => {
      if (!p) {
        return;
      }
      const [k, v] = p.split('=');
      if (!k || v === undefined) {
        return;
      }
      out[k] = v;
    });
    return out;
  };

  const recordProps = (key: string, value: string, bucket: Map<string, Set<string>>) => {
    if (!bucket.has(key)) {
      bucket.set(key, new Set<string>());
    }
    bucket.get(key)!.add(value);
  };

  const normalizeWhenValue = (value: any) => {
    if (value === undefined || value === null) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v)).join('|');
    }
    return String(value);
  };

  const collectFromWhen = (when: any, bucket: Map<string, Set<string>>) => {
    if (!when) {
      return;
    }
    if (Array.isArray(when.OR)) {
      when.OR.forEach((c: any) => collectFromWhen(c, bucket));
      return;
    }
    if (Array.isArray(when.AND)) {
      when.AND.forEach((c: any) => collectFromWhen(c, bucket));
      return;
    }
    Object.entries(when as Record<string, string>).forEach(([k, v]) => {
      const normalized = normalizeWhenValue(v);
      normalized.split('|').forEach(option => recordProps(k, option, bucket));
    });
  };

  const buildPropertyTable = (def: BlockDefinition) => {
    const properties = new Map<string, Set<string>>();
    let defaultProps: Record<string, string> = {};
    const { variants, multipart } = describeBlockDefinition(def);

    if (variants && Object.keys(variants).length > 0) {
      const keys = Object.keys(variants);
      for (const key of keys) {
        const parsed = parseVariantKey(key);
        Object.entries(parsed).forEach(([k, v]) => recordProps(k, v, properties));
        if (Object.keys(defaultProps).length === 0 && (key === '' || key === ' ' || key === undefined)) {
          defaultProps = parsed;
        }
      }
      if (Object.keys(defaultProps).length === 0) {
        defaultProps = parseVariantKey(keys[0]);
      }
    }

    if (multipart && multipart.length > 0) {
      multipart.forEach(part => collectFromWhen(part.when, properties));
      if (Object.keys(defaultProps).length === 0) {
        const first = multipart.find(p => p.when)?.when;
        if (first) {
          collectFromWhen(first, properties);
          defaultProps = {};
          Object.entries(first as Record<string, string>).forEach(([k, v]) => {
            const option = normalizeWhenValue(v).split('|')[0];
            defaultProps[k] = option;
          });
        }
      }
    }

    const propertyObj: Record<string, string[]> = {};
    properties.forEach((values, key) => {
      propertyObj[key] = Array.from(values);
    });

    Object.entries(propertyObj).forEach(([k, v]) => {
      if (defaultProps[k] !== undefined) {
        return;
      }
      defaultProps[k] = v[0];
    });

    return { properties: propertyObj, defaults: defaultProps };
  };

  Object.entries(blockDefinitions).forEach(([id, def]) => {
    const { properties, defaults } = buildPropertyTable(def);
    if (Object.keys(properties).length > 0) {
      blockProperties[id] = properties;
    }
    if (Object.keys(defaults).length > 0) {
      defaultBlockProperties[id] = defaults;
    }
  });

  const blockModels: Record<string, BlockModel> = {};
  Object.keys(vanilla.blockModels).forEach(id => {
    const modelId = Identifier.parse('minecraft:' + id);
    blockModels[modelId.toString()] = createBlockModelFromJson(vanilla.blockModels[id], modelId);
  });
  Object.keys(modAssets.blockModels).forEach(id => {
    blockModels[id] = modAssets.blockModels[id];
  });

  Object.values(blockModels).forEach(m => m.flatten({ getBlockModel: id => blockModels[id.toString()] }));

  const warnedDefinitions = new Set<string>();
  const warnedModels = new Set<string>();
  const warnOnce = (seen: Set<string>, id: string, msg: string) => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    console.warn(msg);
  };

  const resources: Resources = {
    getBlockDefinition: (id: Identifier) => {
      const key = id.toString();
      const def = blockDefinitions[key];
      if (!def) {
        warnOnce(warnedDefinitions, key, `[deepslate resources] Missing block definition for ${key}`);
      }
      return def ?? null;
    },
    getBlockModel: (id: Identifier) => {
      const key = id.toString();
      const model = blockModels[key];
      if (!model) {
        warnOnce(warnedModels, key, `[deepslate resources] Missing block model for ${key}`);
      }
      return model ?? null;
    },
    getTextureUV: (id: Identifier) => atlas.getTextureUV(id),
    getTextureAtlas: () => atlas.getTextureAtlas(),
    getBlockFlags: () => null,
    getBlockProperties: (id: Identifier) => blockProperties[id.toString()] ?? null,
    getDefaultBlockProperties: (id: Identifier) => defaultBlockProperties[id.toString()] ?? null
  };

  return {
    resources,
    blockDefinitions,
    blockModels,
    textureAtlas: atlas,
    autoSubparts: loader.getAutoSubpartDebug(),
    loader
  };
}
