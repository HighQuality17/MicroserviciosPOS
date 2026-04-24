import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const defaultApiUrl = 'http://localhost:3000/api';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = resolveApiProxyTarget(env.VITE_API_URL);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts')) {
              return 'charts';
            }

            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/')
            ) {
              return 'vendor';
            }

            return undefined;
          },
        },
      },
    },
  };
});

function resolveApiProxyTarget(apiUrl: string | undefined) {
  const normalizedApiUrl = apiUrl?.trim() || defaultApiUrl;

  try {
    return new URL(normalizedApiUrl).origin;
  } catch {
    return new URL(defaultApiUrl).origin;
  }
}
