/** @type {import('next').NextConfig} */
const nextConfig = {
  // `@transitflow/types` is a workspace package that ships raw TypeScript
  // (its `main` points at src/index.ts, with no build step). Next.js will not
  // compile TS found under node_modules unless the package is listed here.
  transpilePackages: ['@transitflow/types'],
};

export default nextConfig;
