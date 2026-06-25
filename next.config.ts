import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const hasCustomDomain = process.env.CUSTOM_DOMAIN === 'true';

// Project page: fxbin.github.io/textura/ → needs basePath
// Custom domain: textura.top → no basePath
// Local / Docker: no basePath
const basePath = isGitHubPages && !hasCustomDomain ? '/textura' : '';

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // 暴露给客户端组件，用于手动拼接 public 资源路径（如 <Image>）。
  // Next 的 basePath 不会自动改写 next/image 的 string src，需手动拼接。
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
