module.exports = {
  experimental: {
    serverActions: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

    return config
  },
  images: {
    domains: ["localhost", "127.0.0.1", "storage.googleapis.com"],
  },
}
