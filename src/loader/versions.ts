const MODRINTH_CREATE_VERSIONS_ENDPOINT = 'https://api.modrinth.com/v3/project/LNytGWDc/version?include_changelog=false';

export interface ModrinthCreateVersion {
  id: string;
  version_number: string;
  date_published: string;
  files: {
    url: string;
    filename: string;
    size: number;
  }[];
  loaders: string[];
  game_versions: string[];
}

export async function fetchModrinthCreateVersions (): Promise<ModrinthCreateVersion[]> {
  const response = await fetch(MODRINTH_CREATE_VERSIONS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Failed to fetch Modrinth Create versions: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data as ModrinthCreateVersion[];
}

export interface SupportedVersions {
  create: { version: string; game_versions: string[] }[];
  minecraft: string[];
}

export function mapSupportedVersions (modrinthVersions: ModrinthCreateVersion[]): SupportedVersions {
  // create versions_number strings look like mc1.21.1-6.0.9 or 1.18.2-0.5.0a
  const createVersions = new Set<string>();
  const minecraftVersions = new Set<string>();

  for (const version of modrinthVersions) {
    const createVersion = version.version_number.slice(version.version_number.indexOf('-') + 1);
    createVersions.add(createVersion);

    version.game_versions.forEach(minecraftVersion => minecraftVersions.add(minecraftVersion));
  }

  const supportedVersionsCreate = Array.from(createVersions).map(version => {
    const gameVersions = modrinthVersions
      .filter(v => v.version_number.endsWith(`-${version}`))
      .flatMap(v => v.game_versions);
    return { version, game_versions: Array.from(new Set(gameVersions)) };
  });

  return {
    create: supportedVersionsCreate,
    minecraft: Array.from(minecraftVersions)
  };
}

