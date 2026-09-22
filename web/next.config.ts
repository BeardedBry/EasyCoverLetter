/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Static hosting only — no Next.js server required after build.
  trailingSlash: true,
};

export default nextConfig;
