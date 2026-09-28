import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from https://szauka.github.io/my-radio-stations/
export default defineConfig({
  base: '/my-radio-stations/',
  test: {
    include: ['test/**/*.test.ts'],
  },
});
