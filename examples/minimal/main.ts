
import { createStructureViewer, type SupportedVersions } from '../../src';

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const fileInput = document.getElementById('nbt-input') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLElement;
const createSelect = document.getElementById('create-select') as HTMLSelectElement;
const mcSelect = document.getElementById('minecraft-select') as HTMLSelectElement;

if (!canvas) {
  if (statusEl) {
    statusEl.textContent = 'Canvas not found.';
  }
} else {
  let viewer: ReturnType<typeof createStructureViewer> | null = null;
  let currentFile: File | null = null;
  let currentCreateVersion = '';
  let currentMcVersion = '';

  const updateViewer = async () => {
    currentCreateVersion = createSelect.value;
    currentMcVersion = mcSelect.value;

    if (viewer) {
      viewer.dispose();
      viewer = null;
    }

    if (!currentCreateVersion || !currentMcVersion) {
      return;
    }

    statusEl.textContent = `Initializing viewer for Create ${currentCreateVersion} / MC ${currentMcVersion}`;

    // Path to assets
    const assetsBase = `assets/create/${currentCreateVersion}`;
    const vanillaBase = `assets/minecraft/${currentMcVersion}/`;

    try {
      viewer = createStructureViewer({
        canvas,
        assetsBase,
        vanillaBase,
        statusEl,
        enableResize: true,
        enableMouseControls: true,
        onError: e => {
          console.error(e);
          statusEl.textContent = 'Error: ' + e;
        },
        onStatus: msg => {
          statusEl.textContent = msg;
        }
      });

      if (currentFile) {
        await viewer.loadStructure(currentFile);
      } else {
        statusEl.textContent = 'Ready. Choose an NBT file.';
      }
    } catch (e) {
      console.error(e);
      statusEl.textContent = 'Error creating viewer: ' + e;
    }
  };

  try {
    const supportedVersionsResponse = await fetch('../../assets/supportedVersions.json');
    if (!supportedVersionsResponse.ok) {
      statusEl.textContent = 'Failed to load supported versions.';
      throw new Error('Failed to load supported versions');
    }
    const supported: SupportedVersions = await supportedVersionsResponse.json();

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

      if (previousMc && Array.from(mcSelect.options).some(o => o.value === previousMc)) {
        mcSelect.value = previousMc;
      }

      updateViewer();
    };

    createSelect.addEventListener('change', updateMcSelect);
    mcSelect.addEventListener('change', () => updateViewer());

    updateMcSelect();
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Failed to load supported versions.';
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (file) {
      currentFile = file;
      if (viewer) {
        await viewer.loadStructure(file);
      }
    }
  });
}
