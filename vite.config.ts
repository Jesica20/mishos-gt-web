import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.ts'],
    css: true,
    // alias: {
    //   '@': path.resolve(__dirname, './src'),
    // },
    coverage: {
      provider: 'v8',                // usa @vitest/coverage-v8
      reporter: ['text', 'html', 'lcov'], // consola + reporte html + lcov
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        '**/*.d.ts',
        '**/__tests__/**',
        'src/**/mocks/**',
      ],
      lines: 0, functions: 0, branches: 0, statements: 0, 
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
