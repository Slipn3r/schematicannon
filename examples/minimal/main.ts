import { mat4 } from 'gl-matrix';
import type { NbtTag, Resources, ItemRendererResources } from 'deepslate';
import { BlockDefinition, BlockModel, Identifier, ItemModel, NbtFile, Structure, StructureRenderer, TextureAtlas, jsonToNbt, upperPowerOfTwo } from 'deepslate';

const MCMETA = 'https://raw.githubusercontent.com/misode/mcmeta/';

class InteractiveCanvas {
  private xRotation = 0.8;
  private yRotation = 0.5;

  constructor (
    private readonly canvas: HTMLCanvasElement,
    private readonly onRender: (view: mat4) => void,
    private center?: [number, number, number],
    private viewDist = 4
  ) {
    let dragPos: null | [number, number] = null;
    canvas.addEventListener('mousedown', evt => {
      if (evt.button === 0) {
        dragPos = [evt.clientX, evt.clientY];
      }
    });
    canvas.addEventListener('mousemove', evt => {
      if (dragPos) {
        this.yRotation += (evt.clientX - dragPos[0]) / 100;
        this.xRotation += (evt.clientY - dragPos[1]) / 100;
        dragPos = [evt.clientX, evt.clientY];
        this.redraw();
      }
    });
    canvas.addEventListener('mouseup', () => {
      dragPos = null;
    });
    canvas.addEventListener('wheel', evt => {
      evt.preventDefault();
      this.viewDist += evt.deltaY / 100;
      this.redraw();
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.redraw();
    });

    this.resize();
    this.redraw();
  }

  public resize () {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;
    }
  }

  public setCenter (center: [number, number, number], viewDist: number) {
    this.center = center;
    this.viewDist = viewDist;
    this.redraw();
  }

  public redraw () {
    requestAnimationFrame(() => this.renderImmediately());
  }

  private renderImmediately () {
    this.yRotation = this.yRotation % (Math.PI * 2);
    this.xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.xRotation));
    this.viewDist = Math.max(1, this.viewDist);

    const view = mat4.create();
    mat4.translate(view, view, [0, 0, -this.viewDist]);
    mat4.rotate(view, view, this.xRotation, [1, 0, 0]);
    mat4.rotate(view, view, this.yRotation, [0, 1, 0]);
    if (this.center) {
      mat4.translate(view, view, [-this.center[0], -this.center[1], -this.center[2]]);
    }

    this.onRender(view);
  }
}

interface Assets {
  items: string[];
  blockstates: Record<string, {
    variants?: Record<string, { model: string; x?: number; y?: number; uvlock?: boolean }>;
    multipart?: { when?: Record<string, string | string[]>; apply: { model: string; x?: number; y?: number; uvlock?: boolean } | { model: string; x?: number; y?: number; uvlock?: boolean }[] }[];
  }>;
  models: Record<string, {
    parent?: string;
    ambientocclusion?: boolean;
    display?: Record<string, { rotation?: [number, number, number]; translation?: [number, number, number]; scale?: [number, number, number] }>;
    textures?: Record<string, string>;
    elements?: {
      from: [number, number, number];
      to: [number, number, number];
      rotation?: { origin: [number, number, number]; axis: 'x' | 'y' | 'z'; angle: number; rescale?: boolean };
      shade?: boolean;
      faces: Record<'down' | 'up' | 'north' | 'south' | 'west' | 'east', { uv?: [number, number, number, number]; texture: string; cullface?: string; rotation?: number; tintindex?: number }>;
    }[];
  }>;
  item_models: Record<string, {
    model: {
      type: string;
      model: string;
      [key: string]: unknown;
    };
  }>;
  item_components: Record<string, Record<string, unknown>>;
  uvMap: Record<string, [number, number, number, number]>;
  atlas: HTMLImageElement;
}

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
const fileInput = document.getElementById('nbt-input') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLElement;

statusEl.textContent = 'Choose an NBT file';

let cachedResources: (Resources & ItemRendererResources) | null = null;

async function getResources (): Promise<Resources & ItemRendererResources> {
  if (cachedResources) {
    return cachedResources;
  }
  statusEl.textContent = 'Fetching assets...';
  cachedResources = await createResources();
  return cachedResources;
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  await loadFile(file);
});

async function fetchAssets (): Promise<Assets> {
  const [items, blockstates, models, item_models, item_components, uvMap, atlas] = await Promise.all([
    fetch(`${MCMETA}registries/item/data.min.json`).then(r => r.json()),
    fetch(`${MCMETA}summary/assets/block_definition/data.min.json`).then(r => r.json()),
    fetch(`${MCMETA}summary/assets/model/data.min.json`).then(r => r.json()),
    fetch(`${MCMETA}summary/assets/item_definition/data.min.json`).then(r => r.json()),
    fetch(`${MCMETA}summary/item_components/data.min.json`).then(r => r.json()).catch(() => ({})),
    fetch(`${MCMETA}atlas/all/data.min.json`).then(r => r.json()),
    new Promise<HTMLImageElement>(res => {
      const image = new Image();
      image.onload = () => res(image);
      image.crossOrigin = 'Anonymous';
      image.src = `${MCMETA}atlas/all/atlas.png`;
    })
  ]);
  return { items, blockstates, models, item_models, item_components, uvMap, atlas };
}

async function loadFile (file: File) {
  statusEl.textContent = 'Loading file...';
  const arrayBuffer = await file.arrayBuffer();

  statusEl.textContent = 'Parsing NBT...';
  const nbtFile = NbtFile.read(new Uint8Array(arrayBuffer));
  const structure = await Structure.fromNbt(nbtFile.root);
  statusEl.textContent = 'Rendering structure...';

  return renderStructure(structure);
}

let activeRenderer: StructureRenderer | null = null;
let activeCanvas: InteractiveCanvas | null = null;

async function renderStructure (structure: Structure) {
  if (!gl || !canvas) {
    statusEl.textContent = 'WebGL not supported in this browser.';
    return;
  }

  const resources = await getResources();
  const renderer = new StructureRenderer(gl, structure, resources);
  const size = structure.getSize();
  const center: [number, number, number] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const dist = Math.max(size[0], size[1], size[2]) * 1.5;

  activeRenderer = renderer;
  if (activeCanvas) {
    activeCanvas.setCenter(center, dist);
  } else {
    activeCanvas = new InteractiveCanvas(canvas, view => {
      if (activeRenderer) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        activeRenderer.drawStructure(view);
      }
    }, center, dist);
  }
  statusEl.textContent = '';
}

async function createResources (): Promise<Resources & ItemRendererResources> {
  const { blockstates, models, item_models, item_components, uvMap, atlas } = await fetchAssets();

  const blockDefinitions: Record<string, BlockDefinition> = {};
  Object.keys(blockstates).forEach(id => {
    blockDefinitions['minecraft:' + id] = BlockDefinition.fromJson(blockstates[id]);
  });

  const blockModels: Record<string, BlockModel> = {};
  Object.keys(models).forEach(id => {
    blockModels['minecraft:' + id] = BlockModel.fromJson(models[id]);
  });
  Object.values(blockModels).forEach(m => m.flatten({ getBlockModel: id => blockModels[id.toString()] }));

  const itemModels: Record<string, ItemModel> = {};
  Object.keys(item_models).forEach(id => {
    itemModels['minecraft:' + id] = ItemModel.fromJson(item_models[id].model);
  });

  const itemComponents: Record<string, Map<string, NbtTag>> = {};
  Object.keys(item_components).forEach(id => {
    const components = new Map<string, NbtTag>();
    Object.keys(item_components[id]).forEach(c_id => {
      components.set(c_id, jsonToNbt(item_components[id][c_id]));
    });
    itemComponents['minecraft:' + id] = components;
  });

  const atlasCanvas = document.createElement('canvas');
  const atlasSize = upperPowerOfTwo(Math.max(atlas.width, atlas.height));
  atlasCanvas.width = atlasSize;
  atlasCanvas.height = atlasSize;
  const atlasCtx = atlasCanvas.getContext('2d')!;
  atlasCtx.drawImage(atlas, 0, 0);
  const atlasData = atlasCtx.getImageData(0, 0, atlasSize, atlasSize);
  const idMap: Record<string, [number, number, number, number]> = {};
  Object.keys(uvMap).forEach(id => {
    const [u, v, du, dv] = uvMap[id];
    const dv2 = (du !== dv && id.startsWith('block/')) ? du : dv;
    idMap[Identifier.create(id).toString()] = [u / atlasSize, v / atlasSize, (u + du) / atlasSize, (v + dv2) / atlasSize];
  });
  const textureAtlas = new TextureAtlas(atlasData, idMap);

  const resources: Resources & ItemRendererResources = {
    getBlockDefinition (id) {
      return blockDefinitions[id.toString()];
    },
    getBlockModel (id) {
      return blockModels[id.toString()];
    },
    getTextureUV (id) {
      return textureAtlas.getTextureUV(id);
    },
    getTextureAtlas () {
      return textureAtlas.getTextureAtlas();
    },
    getPixelSize () {
      return textureAtlas.getPixelSize();
    },
    getBlockFlags () {
      return { opaque: false };
    },
    getBlockProperties () {
      return null;
    },
    getDefaultBlockProperties () {
      return null;
    },
    getItemModel (id) {
      return itemModels[id.toString()];
    },
    getItemComponents (id) {
      return itemComponents[id.toString()];
    }
  };

  return resources;
}
