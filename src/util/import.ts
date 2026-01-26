import { execSync } from 'node:child_process';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function importMinecraftVersionResources (version: string) {
  const branches = {
    summary: {
      'registries/data.min.json': 'items.json',
      'assets/block_definition/data.min.json': 'block_definition.json',
      'assets/model/data.min.json': 'model.json',
      'assets/item_definition/data.min.json': 'item_definition.json',
      'item_components/data.min.json': 'item_components.json'
    },
    atlas: {
      'all/data.min.json': 'atlas.json',
      'all/atlas.png': 'atlas.png'
    }
  };

  const baseDir = join(process.cwd(), 'assets', 'minecraft', version);
  await mkdir(baseDir, { recursive: true });

  for (const [branch, files] of Object.entries(branches)) {
    const localFiles = Object.values(files);
    let allFilesExist = true;
    for (const f of localFiles) {
      try {
        await stat(join(baseDir, f));
      } catch {
        allFilesExist = false;
        break;
      }
    }

    if (allFilesExist) {
      console.log(`[${version}] Skipping ${branch} - all files already present.`);
      continue;
    }

    const url = `https://github.com/misode/mcmeta/archive/refs/tags/${version}-${branch}.zip`;
    const zipPath = join(process.cwd(), `temp-${version}-${branch}.zip`);

    console.log(`[${version}] Downloading ${branch} assets...`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[${version}] Skipping ${branch}: ${response.status} ${response.statusText}`);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(zipPath, buffer);

    const zipFolder = `mcmeta-${version}-${branch}`;

    try {
      // List files to avoid errors on missing optional files (older versions)
      const zipList = execSync(`unzip -l "${zipPath}"`).toString();

      for (const [zipFile, localFile] of Object.entries(files)) {
        const fullZipPath = `${zipFolder}/${zipFile}`;

        if (!zipList.includes(fullZipPath)) {
          console.log(`[${version}] Skipping optional ${localFile} (not in archive).`);
          continue;
        }

        console.log(`[${version}] Extracting ${localFile}...`);
        const content = execSync(`unzip -p "${zipPath}" "${fullZipPath}"`, { maxBuffer: 100 * 1024 * 1024 });

        if (localFile === 'items.json') {
          const data = JSON.parse(content.toString());
          const items = data.item || data['minecraft:item'] || [];
          await writeFile(join(baseDir, localFile), JSON.stringify(items));
        } else {
          await writeFile(join(baseDir, localFile), content);
        }
      }
    } finally {
      await rm(zipPath);
    }
  }
}
