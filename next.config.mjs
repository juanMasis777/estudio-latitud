/** @type {import('next').NextConfig} */
const nextConfig = {
  // FFmpeg corre como binario nativo: no debe empaquetarse.
  serverExternalPackages: ["ffmpeg-static"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
