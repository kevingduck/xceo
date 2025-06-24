import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize bundle splitting and chunking
    rollupOptions: {
      output: {
        // Create separate chunks for vendor libraries
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-scroll-area'
          ],
          
          // Chart libraries (heavy - separate chunk)
          'charts-vendor': ['recharts'],
          
          // DnD libraries (heavy - separate chunk)
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          
          // Form libraries
          'form-vendor': ['@hookform/resolvers', 'react-hook-form', 'zod'],
          
          // Query and data libraries
          'data-vendor': ['@tanstack/react-query'],
          
          // Icon libraries
          'icons-vendor': ['lucide-react'],
          
          // Routing
          'router-vendor': ['wouter'],
          
          // Animation libraries
          'animation-vendor': ['framer-motion'],
          
          // Utility libraries
          'utils-vendor': ['clsx', 'class-variance-authority', 'tailwind-merge', 'date-fns']
        },
        
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Optimize chunk sizes
    chunkSizeWarningLimit: 600,
    
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    
    // Minify for production
    minify: 'esbuild'
  },
  
  // Optimize dev server performance
  server: {
    fs: {
      // Allow serving files from one level up to include db files
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'wouter',
      'lucide-react',
      'lodash/get',
      'lodash'
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling to keep them as separate chunks
      '@dnd-kit/core'
    ]
  }
});
