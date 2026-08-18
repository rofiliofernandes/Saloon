import { rm } from 'node:fs/promises';

await Promise.allSettled([
  rm('.next', { recursive: true, force: true }),
  rm('tsconfig.tsbuildinfo', { force: true }),
]);
