import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  platform: 'node',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  exports: {
    bin: {
      'w-process-render': './src/cli.ts',
    },
    exclude: ['cli'],
  },
  deps: {
    neverBundle: ['@napi-rs/canvas'],
  },
})
