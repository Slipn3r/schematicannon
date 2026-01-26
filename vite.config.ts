import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'limestone',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    minify: true
  }
});
