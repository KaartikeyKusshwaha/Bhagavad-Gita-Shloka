import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg', '@electric-sql/pglite', '@electric-sql/pglite-pgvector'],
  experimental: { cpus: 2 },
  typescript: { tsconfigPath: 'tsconfig.json' },
};
export default config;
