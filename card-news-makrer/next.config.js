/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================================
  // Image Optimization
  // ============================================================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },

  // ============================================================================
  // TypeScript & ESLint
  // ============================================================================
  typescript: {
    // Disable type checking during build (verify separately with `npm run type-check`)
    tsconfigPath: './tsconfig.json',
  },

  eslint: {
    // Disable ESLint during build (verify separately)
    ignoreDuringBuilds: false,
  },

  // ============================================================================
  // Transpile Dependencies
  // ============================================================================
  transpilePackages: [
    'fabric', // Fabric.js v6 requires transpilation
  ],

  // ============================================================================
  // Webpack Configuration
  // ============================================================================
  webpack: (config, { isServer }) => {
    // Handle canvas/fabric.js setup
    if (isServer) {
      config.externals.push({
        canvas: 'commonjs canvas',
      });
    }

    return config;
  },

  // ============================================================================
  // Headers for Security
  // ============================================================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // ============================================================================
  // Environment Variables Validation
  // ============================================================================
  env: {
    // These are validated at build/runtime
    // Missing vars will cause errors in initialization
  },

  // ============================================================================
  // Performance & Optimization
  // ============================================================================
  compress: true,
  optimizeFonts: true,
  productionBrowserSourceMaps: false, // Reduce bundle size

  // ============================================================================
  // Experimental Features
  // ============================================================================
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@radix-ui/react-dialog',
    ],
  },

  // ============================================================================
  // Rewrites (API proxy if needed)
  // ============================================================================
  async rewrites() {
    return {
      beforeFiles: [
        // No rewrites needed - API routes are local
      ],
    };
  },
};

module.exports = nextConfig;
