/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // There's a bug in turbopack that causes child dependencies to be missing
  // https://github.com/vercel/next.js/discussions/76247
  // Revisit in the future - maybe the hoisting is working
  serverExternalPackages: [
    "import-in-the-middle",
    "require-in-the-middle",
    "@aws-sdk/client-s3",
  ],
  devIndicators: {
    position: "bottom-right",
  },
  // reactStrictMode: false,
};

export default nextConfig;
