/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import replace from '@rollup/plugin-replace';
import files from './build/plugins/files.js';

export default defineConfig({
  plugins: [
    vue(),
    files(),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src/C:/Windows/system',
    },
  },
});
