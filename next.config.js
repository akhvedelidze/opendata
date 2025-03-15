/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    SERPER_API_KEY: process.env.SERPER_API_KEY,
  }
}

module.exports = nextConfig 