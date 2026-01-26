import { join } from 'node:path';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import { fetchModrinthCreateVersions, mapSupportedVersions } from '../src/loader/versions';
import { importMinecraftVersionResources } from '../src/util/import';

async function main () {
  const args = process.argv.slice(2);
  const clear = args.includes('--clear');
  const assetsDir = join(process.cwd(), 'assets');

  if (clear) {
    console.log(`Clearing ${assetsDir}...`);
    await rm(assetsDir, { recursive: true, force: true });
  }

  console.log('Fetching Create mod versions from Modrinth...');

  try {
    const modrinthVersions = await fetchModrinthCreateVersions();
    const supportedVersions = mapSupportedVersions(modrinthVersions);
    const { minecraft: minecraftVersions } = supportedVersions;

    console.log(`Found ${modrinthVersions.length} Create versions supporting ${minecraftVersions.length} Minecraft versions.`);
    console.log(`Minecraft versions: ${minecraftVersions.join(', ')}`);

    console.log('Saving supportedVersions.json...');
    await mkdir(assetsDir, { recursive: true });
    await writeFile(join(assetsDir, 'supportedVersions.json'), JSON.stringify(supportedVersions, null, 2));

    console.log('---');
    for (const version of minecraftVersions) {
      await importMinecraftVersionResources(version);
    }

    console.log('---');
    console.log('Asset synchronization complete.');
  } catch (err) {
    console.error('Fatal error during asset import:', err);
    process.exit(1);
  }
}

main();
