import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/index.js',
});

console.log('API bundled successfully with esbuild for Node 22 (arm64, CJS).');
