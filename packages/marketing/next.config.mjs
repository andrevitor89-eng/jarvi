import createMDX from '@next/mdx';

const withMDX = createMDX({});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.jarvi.life').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Required so PostHog's reverse-proxy paths (with/without trailing slash) work.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/criar-conta',
        destination: `${APP_URL}/criar-conta`,
        permanent: true,
      },
      {
        source: '/criar-conta/',
        destination: `${APP_URL}/criar-conta`,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Same-origin reverse proxy for PostHog ingestion, to dodge ad/privacy
    // blockers that block us.i.posthog.com. Mirrors the web app's vercel.json.
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
};

export default withMDX(nextConfig);
