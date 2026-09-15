/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // fonts are loaded via <link> at runtime, so the build never needs network
  optimizeFonts: false,
};
module.exports = nextConfig;
