import { LimestoneLoader } from '../../src/loader/structureLoader';
import { loadVersionAssets, createResources, fetchSupportedVersions } from '../../src/loader/resourceLoader';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');
const fileInput = document.getElementById('nbt-input') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLElement;
const createSelect = document.getElementById('create-select') as HTMLSelectElement;
const mcSelect = document.getElementById('minecraft-select') as HTMLSelectElement;

if (!gl || !canvas) {
  statusEl.textContent = 'WebGL not supported in this browser.';
} else {
  let currentVersion: string | null = null;
  let currentFile: File | null = null;

  const loader = new LimestoneLoader(canvas, gl, async () => {
    if (!currentVersion) {
      throw new Error('No Minecraft version selected');
    }
    statusEl.textContent = `Loading ${currentVersion} assets...`;
    const assets = await loadVersionAssets(currentVersion);
    return createResources(assets);
  });

  const updateResources = async (force = false) => {
    const selectedMc = mcSelect.value;
    if (!force && selectedMc === currentVersion) {
      return;
    }

    currentVersion = selectedMc;
    statusEl.textContent = `Updating resources for ${currentVersion}...`;
    loader.clearCanvas();
    try {
      await loader.updateResources();
      if (currentFile) {
        await loader.loadStructure(currentFile, status => {
          statusEl.textContent = status || 'Choose an NBT file';
        });
      }
    } catch (e) {
      console.error(e);
      statusEl.textContent = 'Error updating resources';
    }
  };

  fetchSupportedVersions().then(supported => {
    // Fill Create versions
    supported.create.forEach(c => {
      const option = document.createElement('option');
      option.value = c.version;
      option.textContent = `Create ${c.version}`;
      createSelect.appendChild(option);
    });

    const updateMcSelect = () => {
      const createVersion = createSelect.value;
      const mapping = supported.create.find(c => c.version === createVersion);
      const previousMc = mcSelect.value;
      mcSelect.innerHTML = '';
      mapping?.game_versions.forEach(mc => {
        const option = document.createElement('option');
        option.value = mc;
        option.textContent = `MC ${mc}`;
        mcSelect.appendChild(option);
      });

      // Try to preserve previous MC selection if possible, otherwise trigger update
      if (previousMc && Array.from(mcSelect.options).some(o => o.value === previousMc)) {
        mcSelect.value = previousMc;
        updateResources(true); // Force update because Create version changed
      } else {
        updateResources(); // Will update because MC changed (or first time)
      }
    };

    createSelect.addEventListener('change', updateMcSelect);
    mcSelect.addEventListener('change', () => updateResources());

    // Initial fill
    updateMcSelect();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (file) {
      currentFile = file;
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
