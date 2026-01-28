const MODEL_MANIFEST_FILE = 'model_manifest.json';

type FetchFn = typeof fetch;

const normalizeAssetsBase = (assetsBase: string) => assetsBase.replace(/(\/)+$/, '');

const getDefaultFetch = (): FetchFn | undefined => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  return undefined;
};

export async function loadCreateModelManifest (assetsBase: string, fetchFn?: FetchFn): Promise<string[]> {
  const fetcher = fetchFn ?? getDefaultFetch();
  if (!fetcher) {
    throw new Error('Fetch API not available to load Create model manifest');
  }
  const base = normalizeAssetsBase(assetsBase);
  const url = `${base}/${MODEL_MANIFEST_FILE}`;
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Create model manifest (${response.status} from ${url})`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload) || !payload.every(p => typeof p === 'string')) {
    throw new Error('Create model manifest is invalid (expected string array)');
  }
  return payload;
}

export { MODEL_MANIFEST_FILE };
