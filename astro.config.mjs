import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const messageChannelPolyfill = `if (typeof MessageChannel === "undefined") {
  globalThis.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = {
        postMessage: (data) => {
          setTimeout(() => {
            if (this.port1.onmessage) this.port1.onmessage({ data });
          }, 0);
        }
      };
    }
  };
}
`;

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'message-channel-polyfill',
        banner(chunk) {
          return messageChannelPolyfill;
        },
      },
    ],
    server: {
      watch: {
        ignored: ['**/.wrangler/**', '**/dist/**'],
      },
    },
  },
});
