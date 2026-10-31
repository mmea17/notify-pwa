export default {
  // Cloudflare Scheduled Event - Runs automatically every minute on Cloudflare Edge
  scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        try {
          console.log('Automated Cron Trigger fired at:', new Date().toISOString());
          const res = await fetch('https://notify-pwa-85k.pages.dev/api/cron/tick', {
            method: 'GET',
            headers: {
              'User-Agent': 'Cloudflare-Worker-Cron'
            }
          });
          const data = await res.json();
          console.log('Cron response:', JSON.stringify(data));
        } catch (err) {
          console.error('Failed to trigger cron tick:', err);
        }
      })()
    );
  },

  // HTTP handler for manual health check
  async fetch(request, env, ctx) {
    try {
      const res = await fetch('https://notify-pwa-85k.pages.dev/api/cron/tick', {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Worker-Cron'
        }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err?.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
