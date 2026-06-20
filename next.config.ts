import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const hasCustomDomain = process.env.CUSTOM_DOMAIN === 'true';

const nextConfig: NextConfig = {
  output: "export",
  // Project page: fxbin.github.io/textura/ → needs basePath
  // Custom domain: textura.top → no basePath
  // Local / Docker: no basePath
  basePath: isGitHubPages && !hasCustomDomain ? '/textura' : '',
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
