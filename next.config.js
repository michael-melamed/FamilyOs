/** @type {import('next').NextConfig} */

// Derive the production origin from NEXT_PUBLIC_APP_URL (set in Vercel env vars).
// Falls back gracefully to localhost for local dev.
// This ensures Next.js Server Actions are allowed from both environments.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const appOrigin = (() => {
  try {
    return new URL(appUrl).host; // e.g. "family-os.vercel.app" or "localhost:3000"
  } catch {
    return 'localhost:3000';
  }
})();

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', appOrigin].filter(Boolean),
    },
  },
  images: {
    remotePatterns: [
      {
        // Google OAuth profile pictures
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        // Supabase storage avatars (future use)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

