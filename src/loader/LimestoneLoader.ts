import type { Resources, ItemRendererResources } from 'deepslate';
import { NbtFile, Structure, StructureRenderer } from 'deepslate';
import { InteractiveCanvas } from './InteractiveCanvas';

export class LimestoneLoader {
  private activeRenderer: StructureRenderer | null = null;
  private activeCanvas: InteractiveCanvas | null = null;
  private cachedResources: (Resources & ItemRendererResources) | null = null;

  constructor (
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGLRenderingContext,
    private readonly createResourcesFn: () => Promise<Resources & ItemRendererResources>
  ) {
}

  public async loadStructure (file: File, onProgress?: (status: string) => void) {
    onProgress?.('Loading file...');
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.('Parsing NBT...');
    const nbtFile = NbtFile.read(new Uint8Array(arrayBuffer));
    const structure = await Structure.fromNbt(nbtFile.root);

    onProgress?.('Rendering structure...');
    await this.renderStructure(structure);
    onProgress?.('');
  }

  private async renderStructure (structure: Structure) {
    if (!this.cachedResources) {
      this.cachedResources = await this.createResourcesFn();
    }

    const renderer = new StructureRenderer(this.gl, structure, this.cachedResources);
    const size = structure.getSize();
    const center: [number, number, number] = [size[0] / 2, size[1] / 2, size[2] / 2];
    const dist = Math.max(size[0], size[1], size[2]) * 1.5;

    this.activeRenderer = renderer;

    if (this.activeCanvas) {
      this.activeCanvas.setCenter(center, dist);
    } else {
      this.activeCanvas = new InteractiveCanvas(this.canvas, view => {
        if (this.activeRenderer) {
          this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
          this.activeRenderer.drawStructure(view);
        }
      }, center, dist);
    }
  }
}
