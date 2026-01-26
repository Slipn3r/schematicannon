import { LimestoneLoader } from '../../src/loader/LimestoneLoader';
import { fetchAssets, createResources } from '../../src/loader/ResourceLoader';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
const fileInput = document.getElementById('nbt-input') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLElement;

if (!gl || !canvas) {
  statusEl.textContent = 'WebGL not supported in this browser.';
} else {
  statusEl.textContent = 'Choose an NBT file';

  const loader = new LimestoneLoader(canvas, gl, async () => {
    statusEl.textContent = 'Fetching assets...';
    const assets = await fetchAssets();
    return createResources(assets);
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (file) {
      try {
        await loader.loadStructure(file, status => {
          statusEl.textContent = status || 'Choose an NBT file';
        });
      } catch (e) {
        console.error(e);
        statusEl.textContent = 'Error loading structure';
      }
    }
  });
}
