/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: Allow production builds to successfully complete even if lints exist.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: Allow production builds to successfully complete even if type issues exist in dependencies.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
};

export default nextConfig;
