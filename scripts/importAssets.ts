import { join } from 'node:path';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import { fetchModrinthCreateVersions, mapSupportedVersions } from '../src/loader/versions';
import { importMinecraftVersionResources, importCreateVersionResources } from '../src/util/import';

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
    const { minecraft: minecraftVersions, create: createVersions } = supportedVersions;

    console.log(`Found ${modrinthVersions.length} Create versions supporting ${minecraftVersions.length} Minecraft versions.`);

    console.log('Saving supportedVersions.json...');
    await mkdir(assetsDir, { recursive: true });
    await writeFile(join(assetsDir, 'supportedVersions.json'), JSON.stringify(supportedVersions, null, 2));

    console.log('--- Minecraft synchronization ---');
    console.log(`Target versions: ${minecraftVersions.join(', ')}`);
    for (const version of minecraftVersions) {
      await importMinecraftVersionResources(version);
    }

    console.log('--- Create synchronization ---');
    console.log(`Target versions: ${createVersions.map(c => c.version).join(', ')}`);
    for (const createInfo of createVersions) {
      const version = createInfo.version;
      const matching = modrinthVersions.filter(v => v.version_number.endsWith(`-${version}`));
      const allFiles = matching.flatMap(v => v.files);
      const jars = allFiles.filter(f => f.filename.endsWith('.jar'));

      if (jars.length === 0) {
        console.warn(`[Create ${version}] No JAR files found!`);
        continue;
      }

      const largestJar = jars.reduce((prev, current) => (prev.size > current.size) ? prev : current);
      await importCreateVersionResources(version, largestJar.url);
    }

    console.log('---');
    console.log('Asset synchronization complete.');
  } catch (err) {
    console.error('Fatal error during asset import:', err);
    process.exit(1);
  }
}

main();
